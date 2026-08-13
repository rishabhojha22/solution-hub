export type Availability = "Organization" | "Department" | "Team" | "Restricted";
export type Solution = { id: string; name: string; description: string; category: string; type: string; department: string; team: string; technologies: string[]; verified: boolean; maintained: boolean; reuseCount: number; contributors: number; updated: string; availability: Availability; keywords: string[]; impact: string; accent: string };
export type SolutionRequest = { id: string; title: string; department: string; team: string; description: string; interested: number; status: string };
export type Notification = { id: string; title: string; body: string; time: string; unread: boolean; kind: "success" | "info" | "warning" };
