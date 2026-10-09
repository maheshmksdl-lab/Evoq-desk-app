import type { Agent, Team } from "@/lib/types/ticket";

export const TEAMS: Team[] = [
  { id: "team-tech", name: "Technical Support" },
  { id: "team-billing", name: "Billing Support" },
  { id: "team-success", name: "Customer Success" },
  { id: "team-sales", name: "Sales Support" },
  { id: "team-integrations", name: "Product Support" },
];

export const AGENTS: Agent[] = [
  { id: "agt-sarah", name: "Sarah Wilson", email: "sarah.wilson@desk.example", role: "Support Agent", teamId: "team-tech", status: "available", avatar: "/avatars/agt-sarah.jpg" },
  { id: "agt-daniel", name: "Daniel Carter", email: "daniel.carter@desk.example", role: "Senior Support Agent", teamId: "team-tech", status: "available", avatar: "/avatars/agt-daniel.jpg" },
  { id: "agt-alex", name: "Alex Morgan", email: "alex.morgan@desk.example", role: "Team Lead", teamId: "team-tech", status: "available", avatar: "" },
  { id: "agt-emily", name: "Emily Parker", email: "emily.parker@desk.example", role: "Support Agent", teamId: "team-billing", status: "busy", avatar: "/avatars/agt-emily.jpg" },
  { id: "agt-james", name: "James Anderson", email: "james.anderson@desk.example", role: "Support Agent", teamId: "team-integrations", status: "available", avatar: "/avatars/agt-james.jpg" },
  { id: "agt-olivia", name: "Olivia Thomas", email: "olivia.thomas@desk.example", role: "Team Lead", teamId: "team-success", status: "available", avatar: "/avatars/agt-olivia.jpg" },
  { id: "agt-emma", name: "Emma Davis", email: "emma.davis@desk.example", role: "Support Agent", teamId: "team-billing", status: "away", avatar: "/avatars/agt-emma.jpg" },
];

/** The signed-in agent for this frontend-only build. */
export const CURRENT_AGENT_ID = "agt-sarah";
