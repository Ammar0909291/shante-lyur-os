-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('CONSUMABLE', 'RETAIL', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('PURCHASE', 'PROCEDURE_USE', 'RETAIL_SALE', 'ADJUSTMENT', 'RETURN', 'WASTE', 'TRANSFER');

-- CreateTable: suppliers
CREATE TABLE "suppliers" (
    "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
    "name"         VARCHAR(255) NOT NULL,
    "contact_name" VARCHAR(255),
    "phone"        VARCHAR(30),
    "email"        VARCHAR(255),
    "website"      VARCHAR(255),
    "address"      TEXT,
    "notes"        TEXT,
    "is_active"    BOOLEAN      NOT NULL DEFAULT true,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: inventory_items
CREATE TABLE "inventory_items" (
    "id"              UUID             NOT NULL DEFAULT gen_random_uuid(),
    "name"            VARCHAR(255)     NOT NULL,
    "sku"             VARCHAR(100),
    "category"        "InventoryCategory" NOT NULL,
    "unit"            VARCHAR(30)      NOT NULL,
    "cost_price"      DECIMAL(10,2)    NOT NULL,
    "retail_price"    DECIMAL(10,2),
    "current_stock"   DECIMAL(10,3)    NOT NULL DEFAULT 0,
    "min_stock_level" DECIMAL(10,3)    NOT NULL,
    "max_stock_level" DECIMAL(10,3),
    "supplier_id"     UUID,
    "is_active"       BOOLEAN          NOT NULL DEFAULT true,
    "notes"           TEXT,
    "created_at"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: inventory_movements
CREATE TABLE "inventory_movements" (
    "id"             UUID                    NOT NULL DEFAULT gen_random_uuid(),
    "item_id"        UUID                    NOT NULL,
    "type"           "InventoryMovementType" NOT NULL,
    "quantity"       DECIMAL(10,3)           NOT NULL,
    "stock_before"   DECIMAL(10,3)           NOT NULL,
    "stock_after"    DECIMAL(10,3)           NOT NULL,
    "unit_cost"      DECIMAL(10,2),
    "reference_type" VARCHAR(50),
    "reference_id"   UUID,
    "notes"          TEXT,
    "performed_by"   UUID,
    "created_at"     TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable: service_consumables
CREATE TABLE "service_consumables" (
    "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
    "service_id"       UUID          NOT NULL,
    "item_id"          UUID          NOT NULL,
    "quantity_per_use" DECIMAL(10,3) NOT NULL,
    "is_optional"      BOOLEAN       NOT NULL DEFAULT false,
    "notes"            VARCHAR(500),
    "created_at"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3)  NOT NULL,

    CONSTRAINT "service_consumables_pkey" PRIMARY KEY ("id")
);

-- CreateTable: appointment_consumables
CREATE TABLE "appointment_consumables" (
    "id"             UUID          NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" UUID          NOT NULL,
    "item_id"        UUID          NOT NULL,
    "service_id"     UUID,
    "quantity_used"  DECIMAL(10,3) NOT NULL,
    "unit_cost"      DECIMAL(10,2),
    "notes"          VARCHAR(500),
    "recorded_by"    UUID,
    "created_at"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_consumables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suppliers_is_active_idx" ON "suppliers"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_sku_key" ON "inventory_items"("sku");
CREATE INDEX "inventory_items_category_is_active_idx" ON "inventory_items"("category", "is_active");
CREATE INDEX "inventory_items_supplier_id_idx" ON "inventory_items"("supplier_id");

-- CreateIndex
CREATE INDEX "inventory_movements_item_id_created_at_idx" ON "inventory_movements"("item_id", "created_at");
CREATE INDEX "inventory_movements_type_created_at_idx" ON "inventory_movements"("type", "created_at");
CREATE INDEX "inventory_movements_reference_type_reference_id_idx" ON "inventory_movements"("reference_type", "reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_consumables_service_id_item_id_key" ON "service_consumables"("service_id", "item_id");
CREATE INDEX "service_consumables_service_id_idx" ON "service_consumables"("service_id");
CREATE INDEX "service_consumables_item_id_idx" ON "service_consumables"("item_id");

-- CreateIndex
CREATE INDEX "appointment_consumables_appointment_id_idx" ON "appointment_consumables"("appointment_id");
CREATE INDEX "appointment_consumables_item_id_created_at_idx" ON "appointment_consumables"("item_id", "created_at");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_supplier_id_fkey"
    FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_consumables" ADD CONSTRAINT "service_consumables_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_consumables" ADD CONSTRAINT "service_consumables_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_consumables" ADD CONSTRAINT "appointment_consumables_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "appointment_consumables" ADD CONSTRAINT "appointment_consumables_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
