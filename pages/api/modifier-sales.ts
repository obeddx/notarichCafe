// pages/api/modifier-sales.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Interface untuk respons API
interface ModifierSalesResponse {
  modifierName: string;
  quantity: number;
  totalSales: number;
  hpp: number;
  grossSales: number;
}

function getStartAndEndDates(period: string, dateString?: string): { startDate: Date; endDate: Date } {
  const date = dateString ? new Date(dateString) : new Date();
  let startDate: Date;
  let endDate: Date;

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
    const { period = "daily", date, startDate: startDateQuery, endDate: endDateQuery } = req.query as {
      period?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
    };
    let startDate: Date;
    let endDate: Date;

    if (startDateQuery) {
      startDate = new Date(startDateQuery);
      endDate = endDateQuery
        ? new Date(endDateQuery)
        : new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      const dateStr = date || new Date().toISOString();
      ({ startDate, endDate } = getStartAndEndDates(period, dateStr));
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
    const aggregatedData: Record<number, ModifierSalesResponse> = {};

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

    const result: ModifierSalesResponse[] = Object.values(aggregatedData).sort(
      (a, b) => b.totalSales - a.totalSales
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
}