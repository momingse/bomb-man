import * as z from "zod";

const loginSchema = z.object({
  username: z.string().nonempty("Username is required"),
  password: z.string().nonempty("Password is required"),
});

const registerSchema = z
  .object({
    username: z.string().nonempty("Username is required"),
    password: z.string().nonempty("Password is required"),
    confirmPassword: z.string().nonempty("Confirm Password is required"),
  })
  .refine(
    (data) => {
      return data.password === data.confirmPassword;
    },
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    },
  );

export { loginSchema, registerSchema };
