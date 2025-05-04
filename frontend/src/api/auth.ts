export const loginRequest = async (payload: { username: string; password: string }) => {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    return response;
  } catch (err) {
    throw err;
  }
};

export const registerRequest = async (payload: { username: string; password: string }) => {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    return response;
  } catch (err) {
    throw err;
  }
};

export const logoutRequest = async () => {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    return response;
  } catch (err) {
    throw err;
  }
};
