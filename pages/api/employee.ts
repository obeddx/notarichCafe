import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Ambil semua data Employee
    try {
      const employees = await prisma.employee.findMany({
        include: { role: true },
      });
      return res.status(200).json(employees);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error fetching employees" });
    }
  } else if (req.method === "POST") {
    // Tambah data Employee baru
    try {
      const { employerName, roleId, expiredDate, employeeStatus } = req.body;
      const newEmployee = await prisma.employee.create({
        data: {
          employerName,
          roleId: Number(roleId),
          expiredDate: new Date(expiredDate),
          employeeStatus,
        },
      });
      return res.status(201).json(newEmployee);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error creating employee" });
    }
  } else if (req.method === "PUT") {
    // Update data Employee
    try {
      const { id, employerName, roleId, expiredDate, employeeStatus } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Employee ID is required" });
      }

      const updatedEmployee = await prisma.employee.update({
        where: { id: Number(id) },
        data: {
          employerName,
          roleId: Number(roleId),
          expiredDate: new Date(expiredDate),
          employeeStatus,
        },
      });
      return res.status(200).json(updatedEmployee);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error updating employee" });
    }
  } else if (req.method === "DELETE") {
    // Hapus data Employee
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Employee ID is required" });
      }

      await prisma.employee.delete({
        where: { id: Number(id) },
      });
      return res.status(200).json({ message: "Employee deleted successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error deleting employee" });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
