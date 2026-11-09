/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PrerequisiteEdge {
  courseId: number;
  prerequisiteCourseId: number;
  ruleType?: 'AND' | 'OR';
}

/**
 * Validates whether adding a new prerequisite edge introduces a circular dependency.
 * Builds an adjacency list and performs Depth First Search (DFS) cycle detection.
 */
export class PrerequisiteDAGValidator {
  /**
   * Checks if adding an edge from `courseId` to `prerequisiteCourseId` would create a cycle.
   * Note: The semantic dependency is: To take `courseId`, student must have taken `prerequisiteCourseId`.
   * A cycle exists if `courseId` is reachable from `prerequisiteCourseId`.
   */
  public static wouldCreateCycle(
    existingEdges: PrerequisiteEdge[],
    newCourseId: number,
    newPrereqCourseId: number
  ): { hasCycle: boolean; cyclePath?: number[] } {
    // Trivial self-dependency check
    if (newCourseId === newPrereqCourseId) {
      return { hasCycle: true, cyclePath: [newCourseId, newPrereqCourseId] };
    }

    // Build directed graph adjacency list: prereq -> dependent courses
    // or dependency direction: from course to prerequisites
    const adj = new Map<number, Set<number>>();
    
    // Add existing edges: u requires v
    for (const edge of existingEdges) {
      if (!adj.has(edge.courseId)) {
        adj.set(edge.courseId, new Set<number>());
      }
      adj.get(edge.courseId)!.add(edge.prerequisiteCourseId);
    }

    // Add candidate edge: newCourseId requires newPrereqCourseId
    if (!adj.has(newCourseId)) {
      adj.set(newCourseId, new Set<number>());
    }
    adj.get(newCourseId)!.add(newPrereqCourseId);

    // If newPrereqCourseId can reach newCourseId through its dependencies,
    // then adding this edge introduces a closed cycle!
    const visited = new Set<number>();
    const path: number[] = [];

    const dfs = (current: number, target: number): boolean => {
      visited.add(current);
      path.push(current);

      if (current === target) {
        return true;
      }

      const neighbors = adj.get(current);
      if (neighbors) {
        for (const next of neighbors) {
          if (!visited.has(next)) {
            if (dfs(next, target)) {
              return true;
            }
          }
        }
      }

      path.pop();
      return false;
    };

    const hasCycle = dfs(newPrereqCourseId, newCourseId);
    return {
      hasCycle,
      cyclePath: hasCycle ? [newCourseId, ...path] : undefined,
    };
  }

  /**
   * Topological sort to evaluate prerequisite completion order
   */
  public static getTopologicalOrder(
    courseIds: number[],
    edges: PrerequisiteEdge[]
  ): { valid: boolean; order?: number[] } {
    const inDegree = new Map<number, number>();
    const adj = new Map<number, number[]>();

    for (const id of courseIds) {
      inDegree.set(id, 0);
      adj.set(id, []);
    }

    // For taking edge: courseId -> requires -> prereq
    for (const edge of edges) {
      if (adj.has(edge.prerequisiteCourseId) && inDegree.has(edge.courseId)) {
        adj.get(edge.prerequisiteCourseId)!.push(edge.courseId);
        inDegree.set(edge.courseId, (inDegree.get(edge.courseId) || 0) + 1);
      }
    }

    const queue: number[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const order: number[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      order.push(u);

      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        const newDeg = (inDegree.get(v) || 1) - 1;
        inDegree.set(v, newDeg);
        if (newDeg === 0) {
          queue.push(v);
        }
      }
    }

    if (order.length !== courseIds.length) {
      return { valid: false }; // Cycle detected
    }

    return { valid: true, order };
  }
}
