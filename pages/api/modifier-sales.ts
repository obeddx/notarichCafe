import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AggregatedModifier {
  modifierName: string;
  quantity: number;
  totalSales: number;
  hpp: number;
  grossSales: number;
}

function getStartAndEndDates(period: string, dateString?: string) {
  const date = dateString ? new Date(dateString) : new Date();
  let startDate: Date, endDate: Date;

  switch (period.toLowerCase()) {
    case "daily":
      startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      break;
    case "weekly": {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(date.setDate(diff));
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;
    }
    case "monthly":
      startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      break;
    case "yearly":
      startDate = new Date(date.getFullYear(), 0, 1);
      endDate = new Date(date.getFullYear() + 1, 0, 1);
      break;
    default:
      throw new Error("Invalid period");
  }
  return { startDate, endDate };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let startDate: Date, endDate: Date;

    if (req.query.startDate) {
      startDate = new Date(req.query.startDate as string);
      endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      const period = (req.query.period as string) || "daily";
      const date = req.query.date as string || new Date().toISOString();
      ({ startDate, endDate } = getStartAndEndDates(period, date));
    }

    const completedOrders = await prisma.completedOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        orderItems: {
          include: {
            modifiers: {
              include: {
                modifier: {
                  include: {
                    ingredients: {
                      include: {
                        ingredient: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Agregasi data per modifier
    const aggregatedData: Record<number, AggregatedModifier> = {};

    for (const order of completedOrders) {
      for (const item of order.orderItems) {
        for (const orderModifier of item.modifiers) {
          const modifierId = orderModifier.modifierId;
          const modifier = orderModifier.modifier;

          if (!aggregatedData[modifierId]) {
            aggregatedData[modifierId] = {
              modifierName: modifier.name,
              quantity: 0,
              totalSales: 0,
              hpp: 0,
              grossSales: 0,
            };
          }

          // Jumlah modifier yang terjual berdasarkan quantity item
          const quantity = item.quantity; // Jumlah item yang memesan modifier ini
          const modifierPrice = Number(modifier.price); // Harga modifier
          const totalSales = modifierPrice * quantity;

          // Hitung HPP berdasarkan ingredient yang digunakan di modifier
          let hpp = 0;
          for (const modIngredient of modifier.ingredients) {
            const ingredientPrice = Number(modIngredient.ingredient.price);
            const ingredientAmount = modIngredient.amount;
            hpp += ingredientPrice * ingredientAmount * quantity;
          }

          aggregatedData[modifierId].quantity += quantity;
          aggregatedData[modifierId].totalSales += totalSales;
          aggregatedData[modifierId].hpp += hpp;
          aggregatedData[modifierId].grossSales += totalSales - hpp;
        }
      }
    }

    const result = Object.values(aggregatedData).sort(
      (a, b) => b.totalSales - a.totalSales
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}