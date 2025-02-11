/*
  Warnings:

  - Added the required column `unit` to the `Ingredient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `Status` to the `Menu` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `Menu` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ingredient` ADD COLUMN `unit` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `menu` ADD COLUMN `Status` VARCHAR(191) NOT NULL,
    ADD COLUMN `category` VARCHAR(191) NOT NULL;
