export const leaderboardRequest = async () => {
  try {
    const response = await fetch("/api/user/leaderboard", {
      method: "GET",
      credentials: "include",
    });

    return response;
  } catch (err) {
    throw err;
  }
};
