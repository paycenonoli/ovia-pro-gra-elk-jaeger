const express = require("express")

const { client, httpRequests } = require("./metrics")
const logger = require("./logger")

const app = express()

app.get("/", (req,res)=>{

  httpRequests.labels("GET","/","200").inc()

  logger.info("Home endpoint accessed")

  res.send("Hello Observability")
})

app.get("/error",(req,res)=>{

  httpRequests.labels("GET","/error","500").inc()

  logger.error("Simulated application error")

  res.status(500).send("Application failure")
})

app.get("/metrics", async (req,res)=>{
  res.set("Content-Type",client.register.contentType)
  res.end(await client.register.metrics())
})

app.listen(3000,()=>{
  logger.info("Application started on port 3000")
})
