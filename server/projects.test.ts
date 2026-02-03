import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Projects API", () => {
  let testUserId: number;
  let testProjectId: number;

  beforeAll(async () => {
    // Create a test user
    const user = await db.createUser({
      name: "Test Project Owner",
      email: `project-test-${Date.now()}@test.com`,
      passwordHash: "test-hash",
      loginMethod: "internal",
      role: "user",
      sector: "TI",
      approvalStatus: "approved",
      createdAt: Date.now(),
      lastSignInAt: null,
    });
    
    if (user) {
      testUserId = user.id;
    }
  });

  it("should create a new project", async () => {
    const project = await db.createProject({
      projectId: `proj_test_${Date.now()}`,
      name: "Test Project",
      description: "Test project description",
      status: "Planejamento",
      priority: "Alta",
      ownerId: testUserId,
      ownerName: "Test Project Owner",
      sector: "TI",
      startDate: Date.now(),
      endDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
      progress: 0,
      createdById: testUserId,
      createdByName: "Test Project Owner",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    expect(project).toBeDefined();
    expect(project?.name).toBe("Test Project");
    expect(project?.status).toBe("Planejamento");
    expect(project?.priority).toBe("Alta");
    expect(project?.ownerId).toBe(testUserId);

    if (project) {
      testProjectId = project.id;
    }
  });

  it("should get project by ID", async () => {
    const project = await db.getProjectById(testProjectId);

    expect(project).toBeDefined();
    expect(project?.id).toBe(testProjectId);
    expect(project?.name).toBe("Test Project");
  });

  it("should list all projects", async () => {
    const projects = await db.getAllProjects();

    expect(projects).toBeDefined();
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBeGreaterThan(0);
  });

  it("should filter projects by status", async () => {
    const projects = await db.getAllProjects({ status: "Planejamento" });

    expect(projects).toBeDefined();
    expect(Array.isArray(projects)).toBe(true);
    projects.forEach(project => {
      expect(project.status).toBe("Planejamento");
    });
  });

  it("should update project", async () => {
    const updatedProject = await db.updateProject(testProjectId, {
      status: "Em Andamento",
      progress: 25,
    });

    expect(updatedProject).toBeDefined();
    expect(updatedProject?.status).toBe("Em Andamento");
    expect(updatedProject?.progress).toBe(25);
  });

  it("should create project phase", async () => {
    const phase = await db.createProjectPhase({
      projectId: testProjectId,
      name: "Test Phase",
      description: "Test phase description",
      status: "Pendente",
      order: 1,
      startDate: Date.now(),
      endDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
      completedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    expect(phase).toBeDefined();
    expect(phase?.name).toBe("Test Phase");
    expect(phase?.projectId).toBe(testProjectId);
    expect(phase?.status).toBe("Pendente");
  });

  it("should get phases by project ID", async () => {
    const phases = await db.getPhasesByProjectId(testProjectId);

    expect(phases).toBeDefined();
    expect(Array.isArray(phases)).toBe(true);
    expect(phases.length).toBeGreaterThan(0);
    expect(phases[0].projectId).toBe(testProjectId);
  });

  it("should update project phase", async () => {
    const phases = await db.getPhasesByProjectId(testProjectId);
    const phaseId = phases[0].id;

    const updatedPhase = await db.updateProjectPhase(phaseId, {
      status: "Em Andamento",
    });

    expect(updatedPhase).toBeDefined();
    expect(updatedPhase?.status).toBe("Em Andamento");
  });

  it("should update project progress based on phases", async () => {
    await db.updateProjectProgress(testProjectId);

    const project = await db.getProjectById(testProjectId);
    expect(project).toBeDefined();
    // Progress should be 0% since no phases are completed yet
    expect(project?.progress).toBe(0);
  });

  it("should delete project phase", async () => {
    const phases = await db.getPhasesByProjectId(testProjectId);
    const phaseId = phases[0].id;

    const result = await db.deleteProjectPhase(phaseId);
    expect(result).toBe(true);

    const remainingPhases = await db.getPhasesByProjectId(testProjectId);
    expect(remainingPhases.length).toBe(phases.length - 1);
  });

  it("should delete project", async () => {
    const result = await db.deleteProject(testProjectId);
    expect(result).toBe(true);

    const deletedProject = await db.getProjectById(testProjectId);
    expect(deletedProject).toBeNull();
  });
});
