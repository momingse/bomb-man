import { useState } from "react";
import { Route, Routes } from "react-router";
import AuthPage from "./components/auth/AuthPage";
import PlaygroundPage from "./components/playground/page";
import { RequireAuth } from "./components/RequireAuth";
import RoomPage from "./components/room/page";

function App() {
  return (
    <>
      <Routes>
        <Route index element={<AuthPage />} />
        <Route
          path="/playground"
          element={
            <RequireAuth>
              <PlaygroundPage />
            </RequireAuth>
          }
        />
        <Route
          path="/room"
          element={
            <RequireAuth>
              <RoomPage />
            </RequireAuth>
          }
        />
      </Routes>
    </>
  );
}

export default App;
