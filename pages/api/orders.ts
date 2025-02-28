import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const orders = await prisma.order.findMany({
        include: {
          orderItems: {
            include: {
              menu: true,
              modifiers: {
                include: {
                  modifier: true,
                },
              },
            },
          },
          discount: true,
          reservasi: true, // Tambahkan relasi ini
        },
      });

      console.log("Orders fetched successfully:", orders);
      if (!orders || orders.length === 0) {
        return res.status(200).json({ orders: [], message: "Tidak ada pesanan ditemukan" });
      }

      res.status(200).json({ orders });
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({
        message: "Gagal mengambil data pesanan",
        error: (error as Error).message || "Unknown error",
      });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === "PUT") {
    const { orderId, paymentMethod, paymentId, discountId, cashGiven, change } = req.body;

    if (!orderId || !paymentMethod) {
      return res.status(400).json({ message: "Order ID dan metode pembayaran wajib diisi" });
    }

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              menu: {
                include: {
                  ingredients: { include: { ingredient: true } },
                  bundleCompositions: {
                    include: {
                      menu: {
                        include: {
                          ingredients: { include: { ingredient: true } },
                        },
                      },
                    },
                  },
                },
              },
              modifiers: {
                include: {
                  modifier: {
                    include: {
                      ingredients: { include: { ingredient: true } },
                    },
                  },
                },
              },
            },
          },
          discount: true,
          reservasi: true, // Tambahkan relasi ini
        },
      });

      if (!order) {
        return res.status(404).json({ message: "Pesanan tidak ditemukan" });
      }

      let subtotal = 0;
      let totalModifierCost = 0;
      order.orderItems.forEach((item) => {
        const menuPrice = item.price - (item.modifiers?.reduce((sum, mod) => sum + mod.modifier.price, 0) || 0);
        subtotal += menuPrice * item.quantity;
        totalModifierCost += (item.modifiers?.reduce((sum, mod) => sum + mod.modifier.price * item.quantity, 0) || 0);
      });

      const menuDiscountAmount = order.orderItems.reduce((sum, item) => sum + item.discountAmount, 0);
      let totalDiscountAmount = order.discountAmount;

      if (discountId && discountId !== order.discountId) {
        const discount = await prisma.discount.findUnique({ where: { id: discountId } });
        if (discount && discount.isActive && discount.scope === "TOTAL") {
          const subtotalAfterMenuDiscount = subtotal - menuDiscountAmount;
          const additionalDiscount =
            discount.type === "PERCENTAGE"
              ? (discount.value / 100) * subtotalAfterMenuDiscount
              : discount.value;
          totalDiscountAmount = menuDiscountAmount + additionalDiscount;
        }
      }

      const baseForTaxAndGratuity = subtotal + totalModifierCost - totalDiscountAmount;
      const taxAmount = baseForTaxAndGratuity * 0.10;
      const gratuityAmount = baseForTaxAndGratuity * 0.02;
      const finalTotal = subtotal + totalModifierCost - totalDiscountAmount + taxAmount + gratuityAmount;

      const updatedOrder = await prisma.$transaction(async (prisma) => {
        const newStatus = (order.status === "pending" || order.status === "paid") ? "Sedang Diproses" : order.status;

        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentMethod,
            paymentId: paymentMethod !== "tunai" ? paymentId : null,
            discountId: discountId || order.discountId,
            discountAmount: totalDiscountAmount,
            taxAmount,
            gratuityAmount,
            finalTotal,
            cashGiven: cashGiven ? Number(cashGiven) : null,
            change: change ? Number(change) : null,
            status: newStatus,
          },
          include: {
            orderItems: {
              include: {
                menu: {
                  include: {
                    ingredients: { include: { ingredient: true } },
                    bundleCompositions: {
                      include: {
                        menu: {
                          include: {
                            ingredients: { include: { ingredient: true } },
                          },
                        },
                      },
                    },
                  },
                },
                modifiers: {
                  include: {
                    modifier: {
                      include: {
                        ingredients: { include: { ingredient: true } },
                      },
                    },
                  },
                },
              },
            },
            discount: true,
            reservasi: true, // Tambahkan relasi ini
          },
        });

        if (newStatus === "Sedang Diproses") {
          for (const orderItem of order.orderItems) {
            if (orderItem.menu.type === "BUNDLE") {
              for (const comp of orderItem.menu.bundleCompositions) {
                for (const menuIng of comp.menu.ingredients) {
                  const ingredient = menuIng.ingredient;
                  const usedAmount = (Number(menuIng.amount) || 0) * comp.amount * orderItem.quantity;
                  await prisma.ingredient.update({
                    where: { id: ingredient.id },
                    data: {
                      used: { increment: usedAmount },
                      stock: { decrement: usedAmount },
                    },
                  });
                }
              }
            } else {
              for (const menuIng of orderItem.menu.ingredients) {
                const ingredient = menuIng.ingredient;
                const usedAmount = (Number(menuIng.amount) || 0) * orderItem.quantity;
                await prisma.ingredient.update({
                  where: { id: ingredient.id },
                  data: {
                    used: { increment: usedAmount },
                    stock: { decrement: usedAmount },
                  },
                });
              }
            }

            for (const modifier of orderItem.modifiers) {
              const modifierIngredients = modifier.modifier.ingredients;
              for (const modIng of modifierIngredients) {
                const ingredient = modIng.ingredient;
                const usedAmount = (Number(modIng.amount) || 0) * orderItem.quantity;
                await prisma.ingredient.update({
                  where: { id: ingredient.id },
                  data: {
                    used: { increment: usedAmount },
                    stock: { decrement: usedAmount },
                  },
                });
              }
            }
          }
        }

        return updatedOrder;
      });

      if (res.socket && (res.socket as any).server) {
        const io = (res.socket as any).server.io;
        if (io) {
          io.emit("paymentStatusUpdated", updatedOrder);
          console.log("Status order dikirim ke kasir melalui WebSocket:", updatedOrder);
        } else {
          console.error("WebSocket server belum diinisialisasi");
        }
      }

      res.status(200).json({ success: true, order: updatedOrder });
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Gagal mengonfirmasi pembayaran", error: (error as Error).message });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}