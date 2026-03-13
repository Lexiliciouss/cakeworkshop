export type MockEmployee = {
    id: string;
    name: string;
    skills: string[];
    role?: "maker" | "trainee";
  };
  
  export const employees: MockEmployee[] = [
    {
      id: "emp_lexi",
      name: "Lexi",
      skills: ["Strawberry Cake", "Mango Cake", "Melon Cake"],
      role: "maker",
    },
    {
      id: "emp_lulu",
      name: "Lulu",
      skills: ["Strawberry Cake", "Mango Cake"],
      role: "maker",
    },
    {
      id: "emp_martin",
      name: "Martin",
      skills: ["Assist only"],
      role: "trainee",
    },
  ];