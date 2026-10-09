import type { Contact, Customer } from "@/lib/types/ticket";

export const CUSTOMERS: Customer[] = [
  { id: "cus-acme", status: "active", name: "Acme Technologies", domain: "acmetech.example", phone: "+1 555 014 8900", type: "Business", plan: "Growth", customerSince: "2022-03-14" },
  { id: "cus-northstar", status: "active", name: "Northstar Retail", domain: "northstarretail.example", phone: "+1 555 017 2200", type: "Enterprise", plan: "Enterprise", customerSince: "2020-11-02" },
  { id: "cus-bluepeak", status: "at_risk", name: "BluePeak Logistics", domain: "bluepeak.example", phone: "+1 555 019 4410", type: "Business", plan: "Growth", customerSince: "2023-06-21" },
  { id: "cus-vertex", status: "active", name: "Vertex Health", domain: "vertexhealth.example", phone: "+1 555 012 7730", type: "Enterprise", plan: "Enterprise", customerSince: "2021-08-09" },
  { id: "cus-cedar", status: "at_risk", name: "Cedar Finance", domain: "cedarfinance.example", phone: "+1 555 016 3050", type: "Business", plan: "Starter", customerSince: "2024-01-15" },
  { id: "cus-orion", status: "active", name: "Orion Manufacturing", domain: "orionmfg.example", phone: "+1 555 018 6620", type: "Enterprise", plan: "Growth", customerSince: "2022-09-30" },
  { id: "cus-lumen", status: "active", name: "Lumen Education", domain: "lumen-edu.example", phone: "+1 555 013 9180", type: "Business", plan: "Starter", customerSince: "2025-02-11" },
  { id: "cus-shah", status: "inactive", name: "Ravi Shah", domain: "", phone: "+1 555 011 4472", type: "Individual", plan: "Professional", customerSince: "2025-07-03" },
];

export const CONTACTS: Contact[] = [
  { id: "con-michael", customerId: "cus-acme", name: "Michael Carter", title: "Operations Analyst", email: "michael.carter@example.com", phone: "+1 555 014 8921", avatar: "/avatars/con-michael.jpg" },
  { id: "con-priya", customerId: "cus-acme", name: "Priya Raman", title: "IT Administrator", email: "priya.raman@acmetech.example", phone: "+1 555 014 8934", avatar: "/avatars/con-priya.jpg" },
  { id: "con-rachel", customerId: "cus-northstar", name: "Rachel Kim", title: "E-commerce Manager", email: "rachel.kim@northstarretail.example", phone: "+1 555 017 2241", avatar: "/avatars/con-emily.jpg" },
  { id: "con-marcus", customerId: "cus-northstar", name: "Marcus Lee", title: "Finance Lead", email: "marcus.lee@northstarretail.example", phone: "+1 555 017 2258", avatar: "/avatars/con-marcus.jpg" },
  { id: "con-dbrooks", customerId: "cus-bluepeak", name: "Daniel Brooks", title: "Systems Engineer", email: "daniel.brooks@bluepeak.example", phone: "+1 555 019 4427", avatar: "/avatars/con-dbrooks.jpg" },
  { id: "con-hannah", customerId: "cus-bluepeak", name: "Hannah Ortiz", title: "Operations Coordinator", email: "hannah.ortiz@bluepeak.example", phone: "+1 555 019 4439", avatar: "/avatars/con-hannah.jpg" },
  { id: "con-sophia", customerId: "cus-vertex", name: "Sophia Bennett", title: "Clinical Systems Lead", email: "sophia.bennett@vertexhealth.example", phone: "+1 555 012 7744", avatar: "/avatars/con-sophia.jpg" },
  { id: "con-aaron", customerId: "cus-vertex", name: "Aaron Mills", title: "Information Security Officer", email: "aaron.mills@vertexhealth.example", phone: "+1 555 012 7761", avatar: "/avatars/con-aaron.jpg" },
  { id: "con-jwilson", customerId: "cus-cedar", name: "James Wilson", title: "Financial Controller", email: "james.wilson@cedarfinance.example", phone: "+1 555 016 3068", avatar: "/avatars/con-jwilson.jpg" },
  { id: "con-laura", customerId: "cus-orion", name: "Laura Kim", title: "Plant IT Manager", email: "laura.kim@orionmfg.example", phone: "+1 555 018 6637", avatar: "/avatars/con-laura.jpg" },
  { id: "con-tom", customerId: "cus-orion", name: "Tom Becker", title: "Procurement Manager", email: "tom.becker@orionmfg.example", phone: "+1 555 018 6649", avatar: "/avatars/con-tom.jpg" },
  { id: "con-grace", customerId: "cus-lumen", name: "Grace Holloway", title: "Program Director", email: "grace.holloway@lumen-edu.example", phone: "+1 555 013 9195", avatar: "/avatars/con-grace.jpg" },
  { id: "con-ravi", customerId: "cus-shah", name: "Ravi Shah", title: "Independent Consultant", email: "ravi.shah@example.net", phone: "+1 555 011 4472", avatar: "/avatars/con-ravi.jpg" },
];
