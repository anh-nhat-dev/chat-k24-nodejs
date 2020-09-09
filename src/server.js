const express = require("express");
const socketIO = require("socket.io");
const uuid = require("uuid");
const { emit } = require("nodemon");

const app = express();

app.use("/static", express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/home.html");
});

const PORT = 3000;
const server = app.listen(PORT, () => {
  console.info(`Server listening on port ${PORT}`);
});

const rooms = [
  {
    id: uuid.v4(),
    name: "Room 1",
  },
  {
    id: uuid.v4(),
    name: "Room 2",
  },
  {
    id: uuid.v4(),
    name: "Room 3",
  },
  {
    id: uuid.v4(),
    name: "Room 4",
  },
];

const messages = [];
const users = [];

const io = socketIO(server);

io.on("connection", (socket) => {
  socket.on("LOGIN", (data) => {
    const username = data.username;

    const user = users.find((user) => user.username === username);
    if (user) {
      return socket.emit("VER_PASS");
    }

    if (!user) {
      users.push({ id: uuid.v4(), username });
      return socket.emit("GET_FULL_NAME");
    }
  });

  socket.on("VER_PASS", (data) => {
    const username = data.user;
    const user = users.find((user) => user.username === username);
    if (user && user.pass === data.pass) {
      return socket.emit("R_GET_ROOMS", { rooms });
    }
    return socket.emit("VER_PASS");
  });

  socket.on("SAVE_FULL_NAME", (data) => {
    users.map((user) => {
      if (data.user === user.username) {
        user["fullName"] = data.fullName;
      }
      return user;
    });

    return socket.emit("GET_PASSWORD");
  });

  socket.on("SAVE_PASSWORD", (data) => {
    users.map((user) => {
      if (data.user === user.username) {
        user["pass"] = data.pass;
      }
      return user;
    });

    return socket.emit("R_GET_ROOMS", { rooms });
  });

  //connect room

  socket.on("CONNECT_ROOM", (data) => {
    const id = data.id;

    const room = rooms.find((room) => room.id === id);
    if (room) {
      const roomMess = messages.filter((mes) => mes.roomID === id);
      socket.join(id).emit("JOIN_ROOM_SUCCESS", { room, messages: roomMess });
    }
  });

  // new message

  socket.on("NEW_MESSAGE", (data) => {
    const roomID = data.roomID;
    messages.push(data);
    socket.broadcast.to(roomID).emit("R_NEW_MESSAGE", data);
  });
});
