import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const roles = await prisma.roleEmployee.findMany({
      select: {
        name: true,
        permissions: true,
      },
    });

    const staticOwnerPaths = ["/manager", "/cashier"];
    const roleAccessMapping: { [key: string]: string[] } = {
      owner: staticOwnerPaths,
    };

    roles.forEach((role) => {
      const permissions = role.permissions as string[];
      roleAccessMapping[role.name.toLowerCase()] = permissions
        .map((perm) => {
          switch (perm) {
            // App Permissions (dari sebelumnya)
            case "app.cashier":
              return "/cashier/kasir";
            case "app.menus":
              return "/cashier/menus";
            case "app.layoutCafe":
              return "/cashier/layoutCafe";
            case "app.riwayat":
              return "/cashier/history";
            case "app.reservasi":
              return "/cashier/reservasi";

            // Backoffice Permissions (disesuaikan dengan Sidebar.tsx)
            case "backoffice.viewDashboard":
              return "/manager/dashboard";
            case "backoffice.viewReports.sales":
              return "/manager/report/sales";
            case "backoffice.viewReports.transactions":
              return "/manager/report/transactions";
            case "backoffice.viewMenu.daftarMenu":
              return "/manager/getMenu";
            case "backoffice.viewMenu.kategoriMenu":
              return "/manager/categoryMenu";
            case "backoffice.viewLibrary.bundles":
              return "/manager/library/bundle";
            case "backoffice.viewLibrary.taxes":
              return "/manager/library/taxes";
            case "backoffice.viewLibrary.gratuity":
              return "/manager/library/gratuity";
            case "backoffice.viewLibrary.discount":
              return "/manager/library/diskon";
            case "backoffice.viewModifier.modifier":
              return "/manager/modifier";
            case "backoffice.viewModifier.category":
              return "/manager/modifierCategory";
            case "backoffice.viewIngredients.ingredientsLibrary":
              return "/manager/getBahan";
            case "backoffice.viewIngredients.ingredientsCategory":
              return "/manager/ingridientCategory";
            case "backoffice.viewIngredients.recipes":
              return "/manager/Ingredient/recipes";
            case "backoffice.viewInventory.summary":
              return "/manager/getGudang";
            case "backoffice.viewInventory.supplier":
              return "/manager/inventory/supplier";
            case "backoffice.viewInventory.purchaseOrder":
              return "/manager/inventory/purchaseOrder";
            case "backoffice.viewRekap.stokCafe":
              return "/manager/rekapStokCafe";
            case "backoffice.viewRekap.stokGudang":
              return "/manager/rekapStokGudang";
            case "backoffice.viewRekap.penjualan":
              return "/manager/rekapPenjualan";
            case "backoffice.viewEmployees.employeeSlots":
              return "/manager/employeeSlots";
            case "backoffice.viewEmployees.employeeAccess":
              return "/manager/employeeAccess";

            default:
              return "";
          }
        })
        .filter(Boolean);
    });

    return res.status(200).json(roleAccessMapping);
  } catch (error) {
    console.error("Gagal mengambil data RoleEmployee:", error);
    return res.status(500).json({ error: "Gagal mengambil konfigurasi role" });
  } finally {
    await prisma.$disconnect();
  }
}
