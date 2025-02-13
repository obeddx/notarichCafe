/*
  Warnings:

  - You are about to drop the column `items` on the `completedorder` table. All the data in the column will be lost.
  - You are about to drop the column `items` on the `order` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `completedorder` DROP FOREIGN KEY `CompletedOrder_orderId_fkey`;

-- AlterTable
ALTER TABLE `completedorder` DROP COLUMN `items`;

-- AlterTable
ALTER TABLE `order` DROP COLUMN `items`;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `menuId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_menuId_fkey` FOREIGN KEY (`menuId`) REFERENCES `Menu`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompletedOrder` ADD CONSTRAINT `CompletedOrder_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
