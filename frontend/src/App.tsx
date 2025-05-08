import { useState } from "react";
import { Route, Routes } from "react-router";
import AuthPage from "./components/auth/AuthPage";
import PlaygroundPage from "./components/playground/PlaygroundPage";
import { RequireAuth } from "./components/RequireAuth";
import RoomPage from "./components/room/RoomPage";
import GamePage from "./components/game/GamePage";
import InfoPage from "./components/info/InfoPage";

function App() {
  return (
    <>
      <Routes>
        <Route index element={<AuthPage />} />
        <Route path="/info" element={<InfoPage />} />
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
        <Route
          path="/game"
          element={
            <RequireAuth>
              <GamePage />
            </RequireAuth>
          }
        />
      </Routes>
    </>
  );
}

export default App;
