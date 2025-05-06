import { logger } from "./logger.js";

const rooms = {};

const onlinePlayers = {};

export const socketHandler = (io) => {
  logger.info("Socket handler started");

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on("register", (data) => {
      // check if user already exists
      if (onlinePlayers[socket.id]) {
        logger.info(`User ${data.username} already exists`);
        return;
      }

      logger.info(`User ${data.username} registered`);
      onlinePlayers[socket.id] = {
        username: data.username,
        avatar: data.avatar,
      };
      logger.info(Object.values(onlinePlayers));

      io.emit("onlinePlayers", Object.values(onlinePlayers));
      io.emit("rooms", Object.values(rooms));
    });

    socket.on("createRoom", (data) => {
      logger.info(`Room ${data.name} created`);

      const roomInfo = {
        id: socket.id,
        name: data.name,
        host: onlinePlayers[socket.id].username,
        players: [
          {
            username: onlinePlayers[socket.id].username,
            avatar: onlinePlayers[socket.id].avatar,
            isReady: true,
            isHost: true,
          },
        ],
        maxPlayers: data.maxPlayers,
        started: false,
      };

      rooms[socket.id] = roomInfo;

      io.emit("rooms", Object.values(rooms));

      socket.emit("roomCreated", roomInfo);
    });

    socket.on("joinRoom", (roomId) => {
      logger.info(`User ${onlinePlayers[socket.id].username} joined room`);

      // check if room exists
      if (!rooms[roomId]) {
        logger.info(`Room ${roomId} does not exist`);
        return;
      }

      // check if user already in room
      if (
        rooms[roomId].players.find(
          (player) => player.username === onlinePlayers[socket.id].username,
        )
      ) {
        logger.info(`User ${onlinePlayers[socket.id].username} already in room`);
        return;
      }

      // check if room is full
      if (rooms[roomId].players.length >= rooms[roomId].maxPlayers) {
        logger.info(`Room ${roomId} is full`);
        return;
      }

      // check if room is started
      if (rooms[roomId].started) {
        logger.info(`Room ${roomId} is started`);
        return;
      }

      // add user to room
      rooms[roomId].players.push({
        username: onlinePlayers[socket.id].username,
        avatar: onlinePlayers[socket.id].avatar,
        isReady: false,
        isHost: false,
      });

      io.emit("rooms", Object.values(rooms));
    })

    socket.on("leaveRoom", () => {
      logger.info(`User ${onlinePlayers[socket.id].username} left room`);

      // remove user from room
      // find room that user is in players
      const room = Object.values(rooms).find((room) =>
        room.players.find(
          (player) => player.username === onlinePlayers[socket.id].username,
        ),
      );

      // check of room exists
      if (!room) {
        logger.info(`User ${onlinePlayers[socket.id].username} not in room`);
        return;
      }

      // check if room have only one player
      if (room.players.length === 1) {
        delete rooms[room.id];
        io.emit("rooms", Object.values(rooms));
        return;
      }

      // check if player is host, switch to new host
      if (room.host === onlinePlayers[socket.id].username) {
        // check if player is the first player, if so switch to next player, else switch to first player
        if (room.players[0].username === onlinePlayers[socket.id].username) {
          room.host = room.players[1].username;
          room.players[1].isHost = true;
          room.players[1].isReady = true;
        } else {
          room.host = room.players[0].username;
          room.players[0].isHost = true;
          room.players[0].isReady = true;
        }
      }

      // remove user from room
      rooms[room.id].players = room.players.filter(
        (player) => player.username !== onlinePlayers[socket.id].username,
      );

      io.emit("rooms", Object.values(rooms));
    });

    socket.on("toggleReady", ({roomId, isReady}) => {
      logger.info(`User ${onlinePlayers[socket.id].username} toggled ready`);

      // check if room exists
      if (!rooms[roomId]) {
        logger.info(`Room ${roomId} does not exist`);
        return;
      }

      // check if user is in room
      if (
        !rooms[roomId].players.find(
          (player) => player.username === onlinePlayers[socket.id].username,
        )
      ) {
        logger.info(`User ${onlinePlayers[socket.id].username} not in room`);
        return;
      }

      // toggle isReady
      rooms[roomId].players.find(
        (player) => player.username === onlinePlayers[socket.id].username,
      ).isReady = isReady;

      io.emit("rooms", Object.values(rooms));
    })

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);

      // First check if the player exists
      const player = onlinePlayers[socket.id];
      if (!player) {
        logger.info(`No registered player for socket ${socket.id}`);
        return;
      }

      // Now we can safely check if user is in any room
      const room = Object.values(rooms).find((room) =>
        room.players.find((p) => p.username === player.username),
      );

      if (room) {
        logger.info(`User ${player.username} left room due to disconnect`);

        // remove user from room
        rooms[room.id].players = room.players.filter(
          (p) => p.username !== player.username,
        );

        // If room is empty, remove it
        if (rooms[room.id].players.length === 0) {
          logger.info(`Room ${room.id} is empty, removing`);
          delete rooms[room.id];
        }

        io.emit("rooms", Object.values(rooms));
      }

      // Finally remove the player from online players
      logger.info(`User ${player.username} disconnected`);
      delete onlinePlayers[socket.id];
      io.emit("onlinePlayers", Object.values(onlinePlayers));
    });
  });
};
