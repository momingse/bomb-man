import { useState } from "react";
import { Route, Routes } from "react-router";
import AuthPage from "./components/auth/AuthPage";
import Playground from "./components/playground/Playground";
import { RequireAuth } from "./components/RequireAuth";

function App() {
  return (
    <>
      <Routes>
        <Route index element={<AuthPage />} />
        <Route
          path="/playground"
          element={
            <RequireAuth>
              <Playground />
            </RequireAuth>
          }
        />
      </Routes>
    </>
  );
}

export default App;
