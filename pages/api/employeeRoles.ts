import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      // Ambil semua role + relasi employees
      const roles = await prisma.roleEmployee.findMany({
        include: {
          employees: true,
        },
      });
      return res.status(200).json(roles);
    } else if (req.method === "POST") {
      // Tambah role baru
      const { name, appPermissions, backofficePermissions } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Role name is required" });
      }

      // Simpan data JSON ke kolom appPermissions & backofficePermissions
      const newRole = await prisma.roleEmployee.create({
        data: {
          name,
          appPermissions,
          backofficePermissions,
        },
      });

      return res.status(201).json(newRole);
    } else if (req.method === "PUT") {
      // Edit role
      const { id, name, appPermissions, backofficePermissions } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Role ID is required" });
      }

      // Update kolom name, appPermissions, dan backofficePermissions
      const updatedRole = await prisma.roleEmployee.update({
        where: { id: Number(id) },
        data: {
          name,
          appPermissions,
          backofficePermissions,
        },
      });
      return res.status(200).json(updatedRole);
    } else if (req.method === "DELETE") {
      // Hapus role
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Role ID is required" });
      }

      await prisma.roleEmployee.delete({
        where: { id: Number(id) },
      });
      return res.status(200).json({ message: "Role deleted successfully" });
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server Error" });
  }
}
