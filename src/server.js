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
    type: "public",
  },
  {
    id: uuid.v4(),
    name: "Room 2",
    type: "public",
  },
  {
    id: uuid.v4(),
    name: "Room 3",
    type: "public",
  },
  {
    id: uuid.v4(),
    name: "Room 4",
    type: "public",
  },
];

const messages = [];
const users = [];

const io = socketIO(server);

function connectRoom(data, socket) {
  const id = data.id;

  const room = rooms.find((room) => room.id === id);
  if (room) {
    const roomMess = messages.filter((mes) => mes.roomID === id);
    socket.join(id).emit("JOIN_ROOM_SUCCESS", { room, messages: roomMess });
  }
}

function getRooms(username, socket) {
  console.log("getRooms -> username", username);
  const cUser = users.find((user) => user.username === username);

  if (!cUser) return;

  const newRooms = rooms
    .filter(
      (room) =>
        room.type === "public" ||
        (room.type === "private" && room.users.includes(cUser.id))
    )
    .map((room) => {
      if (room.type === "private") {
        const id = room.users.find((id) => id !== cUser.id);
        const user = users.find((user) => user.id === id);
        room.name = user.fullName;
      }
      return room;
    });

  return socket.emit("R_GET_ROOMS", { rooms: newRooms });
}

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
      return getRooms(username, socket);
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

    return getRooms(data.user, socket);
  });

  socket.on("START_CHAT", (data) => {
    const username = data.username;
    const user = users.find((user) => user.username === username);
    const currentUser = users.find(
      (user) => user.username === data.currentUser
    );
    if (!user || !currentUser) return;

    const cID = currentUser.id;
    const id = user.id;

    let room = rooms.find((room) => {
      if (
        room.type === "private" &&
        room.users.includes(cID) &&
        room.users.includes(id)
      ) {
        return room;
      }
    });

    if (!room) {
      room = {
        id: uuid.v4(),
        name: user.fullName,
        users: [cID, id],
        type: "private",
      };

      rooms.push(room);
    }

    connectRoom({ id: room.id }, socket);
  });

  socket.on("GET_PRIVATE_ROOM_INFO", (data) => {
    const roomID = data.roomID;
    console.log("roomID", roomID);
    const username = data.user;

    const room = rooms.find((room) => room.id === roomID);
    if (!room) return;

    const user = users.find((user) => user.username === username);

    socket.emit("R_GET_PRIVATE_ROOM_INFO", { ...room, name: user.fullName });
  });

  //connect room

  socket.on("CONNECT_ROOM", (data) => connectRoom(data, socket));

  // new message

  socket.on("NEW_MESSAGE", (data) => {
    const roomID = data.roomID;
    const user = users.find((user) => user.username === data.user);
    if (user) {
      data.fullName = user.fullName;
    }
    messages.push(data);
    socket.broadcast.to(roomID).emit("R_NEW_MESSAGE", data);
  });
});
