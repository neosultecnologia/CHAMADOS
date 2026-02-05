import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Stock Management", () => {
  let stockItemId: number;
  let requestId: number;

  beforeAll(async () => {
    // Create a test stock item
    const itemId = await db.createStockItem({
      name: "Test Monitor",
      description: "Test Description",
      category: "Monitor",
      brand: "Dell",
      model: "U2720Q",
      quantity: 10,
      minQuantity: 3,
      location: "Room 101",
      status: "Disponível",
      createdById: 1,
      createdByName: "Test User",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    stockItemId = itemId;
  });

  describe("Stock Items", () => {
    it("should create a stock item", async () => {
      expect(stockItemId).toBeGreaterThan(0);
    });

    it("should retrieve a stock item by ID", async () => {
      const item = await db.getStockItemById(stockItemId);
      expect(item).toBeDefined();
      expect(item?.name).toBe("Test Monitor");
      expect(item?.quantity).toBe(10);
    });

    it("should list all available stock items", async () => {
      const items = await db.getAvailableStockItems();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
    });

    it("should update stock item quantity", async () => {
      await db.updateStockQuantity(stockItemId, 15);
      const item = await db.getStockItemById(stockItemId);
      expect(item?.quantity).toBe(15);
    });

    it("should detect low stock items", async () => {
      // Set quantity below minimum
      await db.updateStockQuantity(stockItemId, 2);
      const lowStockItems = await db.getLowStockItems();
      const foundItem = lowStockItems.find((i: any) => i.id === stockItemId);
      expect(foundItem).toBeDefined();
    });

    it("should update stock item details", async () => {
      await db.updateStockItem(stockItemId, {
        brand: "LG",
        model: "27UP550",
      });
      const item = await db.getStockItemById(stockItemId);
      expect(item?.brand).toBe("LG");
      expect(item?.model).toBe("27UP550");
    });
  });

  describe("Stock Movements", () => {
    it("should create a stock movement record", async () => {
      const movementId = await db.createStockMovement({
        stockItemId,
        type: "Ajuste",
        quantity: 5,
        previousQuantity: 2,
        newQuantity: 7,
        reason: "Inventory correction",
        performedById: 1,
        performedByName: "Test User",
        createdAt: Date.now(),
      });
      expect(movementId).toBeGreaterThan(0);
    });

    it("should retrieve movements for a stock item", async () => {
      const movements = await db.getStockMovementsByItem(stockItemId);
      expect(Array.isArray(movements)).toBe(true);
      expect(movements.length).toBeGreaterThan(0);
    });

    it("should retrieve all stock movements", async () => {
      const allMovements = await db.getAllStockMovements();
      expect(Array.isArray(allMovements)).toBe(true);
    });
  });

  describe("Stock Requests", () => {
    it("should create a stock request", async () => {
      const req = await db.createStockRequest({
        stockItemId,
        requestedQuantity: 2,
        justification: "Need for office setup",
        status: "Pendente",
        requestedById: 2,
        requestedByName: "John Doe",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      requestId = req;
      expect(requestId).toBeGreaterThan(0);
    });

    it("should retrieve a stock request by ID", async () => {
      const request = await db.getStockRequestById(requestId);
      expect(request).toBeDefined();
      expect(request?.status).toBe("Pendente");
      expect(request?.requestedQuantity).toBe(2);
    });

    it("should list all stock requests", async () => {
      const requests = await db.getAllStockRequests();
      expect(Array.isArray(requests)).toBe(true);
      expect(requests.length).toBeGreaterThan(0);
    });

    it("should list pending stock requests", async () => {
      const pendingRequests = await db.getPendingStockRequests();
      expect(Array.isArray(pendingRequests)).toBe(true);
      const found = pendingRequests.find((r: any) => r.id === requestId);
      expect(found).toBeDefined();
    });

    it("should approve a stock request", async () => {
      await db.approveStockRequest(requestId, 1, "Admin User");
      const request = await db.getStockRequestById(requestId);
      expect(request?.status).toBe("Aprovado");
      expect(request?.approvedByName).toBe("Admin User");
    });

    it("should mark a stock request as delivered", async () => {
      await db.markStockRequestDelivered(requestId);
      const request = await db.getStockRequestById(requestId);
      expect(request?.status).toBe("Entregue");
      expect(request?.deliveredAt).toBeDefined();
    });
  });

  describe("Stock Request Rejection", () => {
    it("should create and reject a stock request", async () => {
      const req = await db.createStockRequest({
        stockItemId,
        requestedQuantity: 5,
        justification: "Test rejection",
        status: "Pendente",
        requestedById: 3,
        requestedByName: "Jane Smith",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await db.rejectStockRequest(req, 1, "Admin User");
      const request = await db.getStockRequestById(req);
      expect(request?.status).toBe("Rejeitado");
      expect(request?.approvedByName).toBe("Admin User");
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (stockItemId) {
      await db.deleteStockItem(stockItemId);
    }
  });
});
