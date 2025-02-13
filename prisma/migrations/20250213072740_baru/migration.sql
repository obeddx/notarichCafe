/*
  Warnings:

  - You are about to drop the `userr` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `stockMin` to the `DailyIngredientStock` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `dailyingredientstock` ADD COLUMN `stockMin` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `ingredient` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `stockMin` DOUBLE NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE `userr`;

-- CreateTable
CREATE TABLE `Gudang` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ingredientId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `start` DOUBLE NOT NULL,
    `stockIn` DOUBLE NOT NULL,
    `used` DOUBLE NOT NULL,
    `wasted` DOUBLE NOT NULL,
    `stock` DOUBLE NOT NULL,
    `stockMin` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Gudang_ingredientId_key`(`ingredientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyGudangStock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(3) NOT NULL,
    `gudangId` INTEGER NOT NULL,
    `start` DOUBLE NOT NULL,
    `stockIn` DOUBLE NOT NULL,
    `used` DOUBLE NOT NULL,
    `wasted` DOUBLE NOT NULL,
    `stock` DOUBLE NOT NULL,
    `stockMin` DOUBLE NOT NULL,

    INDEX `DailyGudangStock_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reservasi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `namaCustomer` VARCHAR(191) NOT NULL,
    `nomorKontak` VARCHAR(191) NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `jam` VARCHAR(191) NOT NULL,
    `jumlahTamu` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'booked',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tableNumber` VARCHAR(191) NOT NULL,
    `total` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `menuId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `note` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Gudang` ADD CONSTRAINT `Gudang_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `Ingredient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyGudangStock` ADD CONSTRAINT `DailyGudangStock_gudangId_fkey` FOREIGN KEY (`gudangId`) REFERENCES `Gudang`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
