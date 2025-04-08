import { useState } from "react";
import { Route, Routes } from "react-router";
import AuthPage from "./components/auth/AuthPage";

function App() {
  return (
    <>
      <Routes>
        <Route index element={<AuthPage />} />
      </Routes>
    </>
  );
}

export default App;
