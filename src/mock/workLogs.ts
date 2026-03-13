export type MockWorkLog = {
  id: string;
  product_id: string;
  employee_id: string;
  start_time: string; // ISO
  end_time: string; // ISO
  partner_id?: string | null;
};

// Sample business scenario logs (Lexi, Lulu, Martin)
export const workLogs: MockWorkLog[] = [
  {
    id: "log_001",
    product_id: "prod_strawberry",
    employee_id: "emp_lexi",
    start_time: "2026-03-13T08:10:00.000Z",
    end_time: "2026-03-13T09:05:00.000Z",
    partner_id: null,
  },
  {
    id: "log_002",
    product_id: "prod_mango",
    employee_id: "emp_lulu",
    start_time: "2026-03-13T09:15:00.000Z",
    end_time: "2026-03-13T10:00:00.000Z",
    partner_id: "emp_martin",
  },
  {
    id: "log_003",
    product_id: "prod_melon",
    employee_id: "emp_lexi",
    start_time: "2026-03-13T10:20:00.000Z",
    end_time: "2026-03-13T11:25:00.000Z",
    partner_id: "emp_martin",
  },
  {
    id: "log_004",
    product_id: "prod_strawberry",
    employee_id: "emp_lulu",
    start_time: "2026-03-13T12:30:00.000Z",
    end_time: "2026-03-13T13:10:00.000Z",
    partner_id: null,
  },
];
