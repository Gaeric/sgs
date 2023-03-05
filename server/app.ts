import express from "npm:express@^4.17.1";
import { serve } from "https://deno.land/std@0.150.0/http/server.ts";
import { Server } from "https://deno.land/x/socket_io@0.2.0/mod.ts";
import path from "npm:path";
// import * as path from "path";

const __dirname = new URL(".", import.meta.url).pathname;

class App {
  private app: express.Express = express();
  constructor() {
    console.log("constructor");
    this.app
      .get("/", (req, res) => {
        console.log(111);
        res.sendFile(path.join(__dirname), "../index.html");
      })
      .get("/sgs", (req, res) => {
        res.sendfile(path.join(__dirname, "../build/index.html"));
      });

    // .get("/", (req, res) => {
    //   res.sendFile(path.join(__dirname), "../home/index.html");
    // });
    this.setViewEngine("ejs");
  }
  private setViewEngine(view: string) {
    this.app.set("views", "public");
    this.app.set("view engine", view);
  }
  public start() {
    const socket = new Server(this.app);

    socket.emit("message", 5, "6");
    socket.on("message", (args) => {
      console.log(111);
      console.log(args);
    });
    this.app.listen(80, () => {
      console.log("listen on ");
    });
  }
}
new App().start();
