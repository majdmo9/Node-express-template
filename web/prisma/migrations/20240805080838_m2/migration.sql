-- CreateTable
CREATE TABLE `SavedCart` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER NOT NULL,
    `productVariants` JSON NOT NULL,

    UNIQUE INDEX `SavedCart_customerId_key`(`customerId`),
    INDEX `customerId_index`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
