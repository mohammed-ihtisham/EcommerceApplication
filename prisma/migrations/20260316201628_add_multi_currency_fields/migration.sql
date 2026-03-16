-- AlterTable
ALTER TABLE "Order" ADD COLUMN "exchangeRateSnapshot" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrderItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "productImageSnapshot" TEXT NOT NULL,
    "unitAmountSnapshot" INTEGER NOT NULL,
    "currencySnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotalAmount" INTEGER NOT NULL,
    "chargeUnitAmount" INTEGER NOT NULL DEFAULT 0,
    "chargeLineTotalAmount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("currencySnapshot", "id", "lineTotalAmount", "orderId", "productId", "productImageSnapshot", "productNameSnapshot", "quantity", "unitAmountSnapshot") SELECT "currencySnapshot", "id", "lineTotalAmount", "orderId", "productId", "productImageSnapshot", "productNameSnapshot", "quantity", "unitAmountSnapshot" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
