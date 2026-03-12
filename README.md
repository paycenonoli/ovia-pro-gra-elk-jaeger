

An example implementation of observability using Prometheus, Grafana, ELK, and Jaeger for a Node.js application

Below is a simple but realistic observability implementation for a Node.js microservice using the four common pillars you mentioned:

Prometheus → metrics

Grafana → metrics visualization

ELK Stack (Elasticsearch + Logstash + Kibana) → logs

Jaeger → distributed tracing

This mirrors how observability is commonly implemented in production Kubernetes environments (which fits nicely with the Kubernetes work you’ve been practicing).

1. Architecture Overview
A typical observability flow for a Node.js service looks like this:

                 ┌──────────────┐
                 │  Node.js App │
                 └──────┬───────┘
                        │
        ┌───────────────┼────────────────┐
        │               │                │
     Metrics           Logs           Traces
        │               │                │
   Prometheus       Logstash         Jaeger Agent
        │               │                │
        │          Elasticsearch        │
        │               │                │
      Grafana         Kibana         Jaeger UI
So the application emits three telemetry signals:

Metrics

Logs

Traces

2. Node.js Application
Example Express application.

npm init -y
npm install express prom-client winston opentelemetry-api \
@opentelemetry/sdk-node \
@opentelemetry/auto-instrumentations-node \
@opentelemetry/exporter-jaeger
3. Metrics with Prometheus
Install Prometheus client:

npm install prom-client
Example implementation:

const express = require("express");
const client = require("prom-client");

const app = express();

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP Requests",
  labelNames: ["method", "route", "status"]
});

app.get("/", (req, res) => {
  httpRequestCounter.labels("GET", "/", "200").inc();
  res.send("Hello Observability!");
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(3000, () => {
  console.log("App running on port 3000");
});
Prometheus will scrape:

http://node-app:3000/metrics
Example Prometheus config:

scrape_configs:
  - job_name: "nodejs-app"
    static_configs:
      - targets: ["node-app:3000"]
4. Logging with ELK Stack
Install logging library:

npm install winston
Example structured logging:

const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

logger.info("Application started");
Logs output:

{
 "level":"info",
 "message":"Application started",
 "timestamp":"2026-03-12T02:00:00Z"
}
These logs are collected by Logstash or Filebeat and sent to Elasticsearch.

Example Logstash pipeline:

input {
  beats {
    port => 5044
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "nodejs-logs"
  }
}
Visualization happens in Kibana.

5. Distributed Tracing with Jaeger
Install OpenTelemetry:

npm install \
@opentelemetry/sdk-node \
@opentelemetry/exporter-jaeger \
@opentelemetry/auto-instrumentations-node
Tracing setup:

const { NodeSDK } = require("@opentelemetry/sdk-node");
const { JaegerExporter } = require("@opentelemetry/exporter-jaeger");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");

const jaegerExporter = new JaegerExporter({
  endpoint: "http://jaeger:14268/api/traces"
});

const sdk = new NodeSDK({
  traceExporter: jaegerExporter,
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
This automatically traces:

HTTP calls

Express middleware

database calls

service-to-service requests

In Jaeger UI, you can see:

Request Trace
 ├── API Gateway
 │     └── Node.js Service
 │            └── Database Query
6. Grafana Visualization
Grafana connects to Prometheus as a datasource.

Example dashboard metrics:

Request rate

rate(http_requests_total[1m])
Error rate

rate(http_requests_total{status="500"}[5m])
CPU usage

process_cpu_seconds_total
Example dashboard panels:

Requests per second
Error percentage
Latency
Memory usage
7. Docker Compose Example (Local Observability Lab)
A minimal stack:

version: "3"

services:

  node-app:
    build: .
    ports:
      - "3000:3000"

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"

  elasticsearch:
    image: elasticsearch:8.12.0
    ports:
      - "9200:9200"

  kibana:
    image: kibana:8.12.0
    ports:
      - "5601:5601"

  jaeger:
    image: jaegertracing/all-in-one
    ports:
      - "16686:16686"
Dashboards:

Prometheus → http://localhost:9090
Grafana → http://localhost:3001
Kibana → http://localhost:5601
Jaeger → http://localhost:16686
8. What Happens During a Real Request
Example request:

curl http://node-app:3000/
Observability pipeline:

1️⃣ Request hits Node.js service

2️⃣ Metrics

http_requests_total increases

Prometheus scrapes it

3️⃣ Logs

Winston logs request

Logstash → Elasticsearch → Kibana

4️⃣ Trace

OpenTelemetry generates trace

Exported to Jaeger

5️⃣ Visualization

Grafana shows metrics dashboard

Kibana shows logs

Jaeger shows request trace

9. How to Explain This in an Interview
A concise DevOps interview answer:

In our Node.js microservices platform, we implemented observability using Prometheus, Grafana, ELK, and Jaeger. The application exposes metrics using the Prometheus client library, which Prometheus scrapes and Grafana visualizes through dashboards. Logs are structured using Winston and shipped to Elasticsearch through Logstash for analysis in Kibana. For distributed tracing, we instrument services with OpenTelemetry and export traces to Jaeger, allowing us to track request flows across services. This combination gives us full observability across metrics, logs, and traces for effective monitoring and troubleshooting.

If you'd like, I can also show you a real production-grade Kubernetes observability architecture used in companies (Prometheus Operator, Loki, Tempo, OpenTelemetry Collector, etc.).
It’s the modern evolution of the stack you asked about, and it’s extremely useful for DevOps interviews.


I just want you to help me let's demo together an example scenario. Walk me through the installation/setup for the tools and with detailed explanation, how I can go from one tool to another when an incident occurs.

Let’s treat this like a real DevOps observability lab, the same way a team would set it up internally to troubleshoot production incidents. I will guide you step-by-step so you can actually build it and demonstrate it during interviews.

The idea is simple: we will create a Node.js service, then wire it to four observability systems.

Metrics → Prometheus → Grafana
Logs → ELK (Elasticsearch + Kibana)
Traces → Jaeger

Then we will simulate a production incident and investigate it like a DevOps engineer.

Step 0 — What We Are Building
Think of this as your mini production platform.

Client
  │
  ▼
Node.js API
 │    │    │
 │    │    │
Metrics Logs Traces
 │    │    │
 ▼    ▼    ▼
Prometheus Elasticsearch Jaeger
 │          │
 ▼          ▼
Grafana     Kibana
Each tool answers a different question.

Tool	What it answers
Prometheus	Is the system healthy?
Grafana	What trends are happening?
Kibana	What exactly went wrong?
Jaeger	Where in the request path did it fail?
This workflow is very common in Kubernetes production clusters like the ones you’ve been building with kubeadm and EKS.

Step 1 — Install Docker (Easiest Lab Method)
We’ll run everything with containers.

Ubuntu / Amazon Linux:

sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker
sudo systemctl start docker
Verify:

docker --version
docker compose version
Step 2 — Create Project Folder
mkdir observability-lab
cd observability-lab
Structure:

observability-lab
 ├── docker-compose.yml
 ├── prometheus.yml
 └── app
      ├── Dockerfile
      ├── app.js
      └── package.json
Step 3 — Create the Node.js Application
Enter the app folder.

mkdir app
cd app
npm init -y
Install dependencies.

npm install express prom-client winston
Step 4 — Node.js Application Code
Create app.js

const express = require("express")
const client = require("prom-client")
const winston = require("winston")

const app = express()

/* PROMETHEUS METRICS */

const collectDefaultMetrics = client.collectDefaultMetrics
collectDefaultMetrics()

const requestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method","route","status"]
})

/* LOGGER */

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
})

/* ROUTES */

app.get("/", (req,res)=>{
  requestCounter.labels("GET","/","200").inc()

  logger.info("Home endpoint called")

  res.send("Hello from Observability Demo")
})

/* ERROR ROUTE TO SIMULATE INCIDENT */

app.get("/error",(req,res)=>{
  requestCounter.labels("GET","/error","500").inc()

  logger.error("Database connection failed")

  res.status(500).send("Something broke")
})

/* METRICS ENDPOINT */

app.get("/metrics", async (req,res)=>{
  res.set("Content-Type",client.register.contentType)
  res.end(await client.register.metrics())
})

app.listen(3000,()=>{
  console.log("Node app running on port 3000")
})
This app now produces three observability signals

metrics

logs

errors

Step 5 — Create Dockerfile
FROM node:20

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

CMD ["node","app.js"]
Step 6 — Configure Prometheus
Create prometheus.yml

global:
  scrape_interval: 5s

scrape_configs:
  - job_name: "node-app"
    static_configs:
      - targets: ["node-app:3000"]
Prometheus will scrape:

http://node-app:3000/metrics
Step 7 — Create docker-compose
Create docker-compose.yml

version: '3'

services:

  node-app:
    build: ./app
    ports:
      - "3000:3000"

  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"

  elasticsearch:
    image: elasticsearch:8.12.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  kibana:
    image: kibana:8.12.0
    ports:
      - "5601:5601"

  jaeger:
    image: jaegertracing/all-in-one
    ports:
      - "16686:16686"
Step 8 — Start the Platform
Run:

docker compose up -d
Check containers:

docker ps
Step 9 — Access the Observability Tools
Node App

http://localhost:3000
Prometheus

http://localhost:9090
Grafana

http://localhost:3001
Default login:

admin
admin
Kibana

http://localhost:5601
Jaeger

http://localhost:16686
Step 10 — Simulate Traffic
Generate requests.

curl localhost:3000
Now simulate a failure.

curl localhost:3000/error
Repeat multiple times.

Step 11 — Investigating an Incident (Real DevOps Workflow)
Imagine this alert fires:

High HTTP 500 error rate
Now we investigate step by step.

Step 12 — Step 1: Prometheus (Detect the Problem)
Open Prometheus.

Query:

http_requests_total
You will see something like:

http_requests_total{route="/error",status="500"}
Meaning errors are increasing.

Now you know:

There is a failure happening.

But you don’t know why yet.

Step 13 — Step 2: Grafana (Visualize the Trend)
Add Prometheus as a datasource.

Datasource URL:

http://prometheus:9090
Create dashboard.

Query:

rate(http_requests_total[1m])
You will see the error spike over time.

Now you know:

When the problem started
How fast it's growing
But still not the root cause.

Step 14 — Step 3: Kibana (Find the Root Cause)
Open Kibana.

Search logs.

Example log:

Database connection failed
Now you see the exact error message.

So now we know:

The application cannot connect to the database
But we still don't know where the failure occurred in the request path.

Step 15 — Step 4: Jaeger (Trace the Request)
Open Jaeger.

Search for traces.

You might see:

API Gateway
   ↓
Node.js service
   ↓
Database query
   ✖ FAILED
Now we know the exact location of failure.

Step 16 — The Observability Investigation Flow
This is the standard troubleshooting sequence.

Alert
  │
  ▼
Prometheus
  │
  ▼
Grafana
  │
  ▼
Kibana
  │
  ▼
Jaeger
Or simplified:

Metrics → Logs → Traces
Step 17 — How to Explain This in an Interview
A strong DevOps answer:

When an alert fires, we first check Prometheus metrics to detect abnormal behavior like spikes in error rates or latency. Then we analyze Grafana dashboards to determine when the issue started and how widespread it is. After that we inspect logs in Kibana to identify specific error messages or failures. Finally we use Jaeger distributed tracing to trace the full request path across services and identify exactly where the failure occurred.

That shows you understand observability workflows used in production systems.

If you'd like, I can also show you something extremely valuable for DevOps engineers:

A realistic production incident simulation (CPU spike + slow API + failing database) and how an SRE investigates it step-by-step using these tools.

It’s one of the most powerful demos you can show in interviews.


Yes

Good. Let’s run a realistic production incident simulation. I will walk you through it the same way an SRE or DevOps engineer investigates an outage in production. The goal is not just to install tools, but to develop the investigative mindset.

We will simulate this scenario:

Users complain that the API is extremely slow and sometimes returns 500 errors.

Your job as the DevOps engineer is to trace the problem across metrics, logs, and traces.

Step 1 — Modify the Application to Simulate a Production Problem
We will simulate a slow database query and random failures.

Update your app.js.

const express = require("express")
const client = require("prom-client")
const winston = require("winston")

const app = express()

/* PROMETHEUS METRICS */

const collectDefaultMetrics = client.collectDefaultMetrics
collectDefaultMetrics()

const requestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method","route","status"]
})

const requestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Request latency",
  labelNames: ["route"]
})

/* LOGGER */

const logger = winston.createLogger({
  level:"info",
  format: winston.format.json(),
  transports:[new winston.transports.Console()]
})

/* NORMAL ROUTE */

app.get("/", async (req,res)=>{

  const end = requestDuration.startTimer()

  logger.info("Processing request")

  await new Promise(resolve=>setTimeout(resolve,200))

  requestCounter.labels("GET","/","200").inc()

  end({route:"/"})

  res.send("Healthy response")

})

/* INCIDENT ROUTE */

app.get("/api/orders", async (req,res)=>{

  const end = requestDuration.startTimer()

  logger.info("Fetching orders from database")

  /* simulate slow DB */

  const delay = Math.random()*4000

  await new Promise(resolve=>setTimeout(resolve,delay))

  if(delay > 3000){

    logger.error("Database timeout")

    requestCounter.labels("GET","/api/orders","500").inc()

    end({route:"/api/orders"})

    return res.status(500).send("Database timeout")

  }

  requestCounter.labels("GET","/api/orders","200").inc()

  end({route:"/api/orders"})

  res.json({orders:[1,2,3]})

})

/* METRICS */

app.get("/metrics", async (req,res)=>{
  res.set("Content-Type",client.register.contentType)
  res.end(await client.register.metrics())
})

app.listen(3000,()=>{
  console.log("Application running")
})
What this simulates:

Condition	Behavior
Normal request	fast response
Slow DB	request delay
Very slow DB	500 error
This mirrors a very common production failure.

Step 2 — Restart the Stack
Rebuild the container.

docker compose down
docker compose up --build -d
Step 3 — Generate Traffic
Simulate users.

Run this repeatedly:

curl localhost:3000/api/orders
or

while true; do curl localhost:3000/api/orders; sleep 1; done
Soon you will see:

Database timeout
Now the incident has started.

Incident Investigation (Real DevOps Flow)
You never start randomly. The investigation always follows a signal hierarchy.

Metrics → Logs → Traces
Step 4 — Detect the Incident (Prometheus)
Open:

http://localhost:9090
Run query:

rate(http_requests_total[1m])
You may see:

/api/orders status=500
Errors are increasing.

Now check latency.

Query:

http_request_duration_seconds
This shows:

requests are taking longer than normal
Now you know:

The system is slow AND erroring.
But you still don't know why.

Step 5 — Visualize the Incident (Grafana)
Open Grafana.

http://localhost:3001
Add datasource:

http://prometheus:9090
Create dashboard.

Panel query:

rate(http_requests_total[1m])
Second panel:

histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m]))
Now you see something powerful:

Latency spike BEFORE the error spike
That tells you something critical.

The system becomes slow first
Then it starts failing
That is a classic database performance issue.

Step 6 — Investigate Logs (Kibana)
Open:

http://localhost:5601
Search logs.

You will see entries like:

Fetching orders from database
and

Database timeout
Now the evidence is clearer.

The application cannot retrieve orders from the database fast enough.
But we still don't know where in the request chain the delay occurs.

Step 7 — Use Distributed Tracing (Jaeger)
Open:

http://localhost:16686
Search traces for the service.

You will see traces like:

Client request
     ↓
Node.js API
     ↓
Database query
     ↓
4 seconds
     ↓
Timeout
This reveals:

The delay is inside the database call
Now the root cause is clear.

Final Diagnosis
From the investigation:

Metrics showed:

Latency spike
Error spike
Logs showed:

Database timeout
Tracing showed:

Slow database call
Therefore:

Root cause: database performance degradation
Real Production Troubleshooting Mindset
The workflow always follows this ladder.

Alert
 ↓
Metrics (Prometheus)
 ↓
Dashboards (Grafana)
 ↓
Logs (Kibana)
 ↓
Tracing (Jaeger)
 ↓
Root Cause
Each tool answers a different question.

Tool	Question
Prometheus	Is something wrong?
Grafana	When did it start?
Kibana	What error happened?
Jaeger	Where did it happen?
What Senior DevOps Engineers Understand
Observability tools are not separate.

They form one investigative pipeline.

Metrics → Logs → Traces
When someone masters that flow, they can troubleshoot almost any production outage.

If you want, I can also show you something extremely useful for your DevOps growth:

The “5 Golden Signals of Monitoring” used by Google SREs, and how they map directly to Prometheus and Grafana dashboards.

Those signals are the foundation of almost every production monitoring system.


When you say: Search logs, how do I search or what do I search?

That is a very important question. Many engineers install observability tools but are unsure how to actually use them during an incident. Let me walk you through how log investigation really works in Kibana during a production issue.

Think of logs as the detailed diary of your application. When an alert fires, your goal is to quickly narrow down the relevant log entries.

First: Open Kibana

Navigate to:

http://localhost:5601
Once Kibana loads, go to:

Analytics → Discover
This is where you explore logs.

If this is your first time, Kibana may ask you to create an index pattern.

Use:

logstash-* 
or

*
This tells Kibana which logs to display from Elasticsearch.

Step 1: Narrow down by time

The very first thing engineers do during an incident is filter by time.

Top right corner of Kibana:

Last 15 minutes
Last 1 hour
Custom time range
Example:

If your alert fired at 10:32 AM, set the range to:

10:25 → 10:40
This removes thousands of irrelevant logs.

Step 2: Search for errors

In the Kibana search bar you can type queries.

Example:

level:error
or

error
This filters logs containing the word error.

Example result:

Database timeout
Now you immediately know something is wrong with the database connection.

Step 3: Search by service

In microservices environments you usually filter by service name.

Example query:

service:orders-api
or

service:node-app
This prevents logs from other services polluting the investigation.

Step 4: Search by endpoint

Suppose Grafana shows the issue occurs on:

/api/orders
Search:

message:"/api/orders"
or

route:"/api/orders"
Now you only see logs related to that endpoint.

Example:

Fetching orders from database
Database timeout
Now the story is forming.

Step 5: Search for specific error text

Once you see an error message, you can search for all occurrences.

Example:

"Database timeout"
Kibana will now show every instance of that failure.

From this you can determine:

• how frequently it happens
• when it started
• whether it is increasing

Step 6: Correlate with metrics

Suppose Grafana shows error spikes at 10:32.

Look at logs around that time.

You may see:

10:31:55 Fetching orders from database
10:31:58 Fetching orders from database
10:32:02 Database timeout
10:32:04 Database timeout
Now you know exactly what changed at the moment the alert fired.

Step 7: Look at the full log record

Click a log entry.

You will see detailed fields like:

timestamp
service
log level
message
host
container
trace_id
If tracing is enabled, you can even see:

trace_id
You can copy that into Jaeger to see the full request trace.

That is how logs and traces connect together.

Example Real Investigation

Alert fires:

High API error rate
Step 1 — Grafana

You see errors on:

/api/orders
Step 2 — Kibana search

route:"/api/orders"
Result:

Database timeout
Step 3 — confirm frequency

Search:

"Database timeout"
Result:

hundreds of occurrences
Step 4 — open Jaeger

Trace shows:

API → database query → timeout
Root cause found.

A mental model that helps DevOps engineers

Think of observability tools like this:

Metrics tell you that something is wrong.

Logs tell you what went wrong.

Traces tell you where it went wrong.

Prometheus → Kibana → Jaeger
   WHY        WHAT       WHERE
If you'd like, I can also show you the 7 Kibana search queries that DevOps engineers use most during production incidents.

Those queries alone can make you look very experienced during an interview or on-call troubleshooting.


Yes

When an incident happens, engineers rarely type random words into Kibana. Over time, a small set of very practical queries emerges that quickly narrow the problem. I’ll show you seven that many DevOps/SRE teams rely on during investigations. Imagine you are in Kibana → Discover, looking at logs stored in Elasticsearch.

1. Find all errors immediately

Start broad to see whether the system is throwing obvious errors.

level:error
or simply

error
What this reveals:

• exceptions
• database failures
• service crashes

Example result:

ERROR Database timeout
This often gives the first clue about the failure.

2. Filter logs for one service

In a microservices platform you might have dozens of services writing logs.

To isolate the service experiencing the issue:

service:node-app
or

kubernetes.container_name:node-app
This removes noise from other applications.

3. Investigate a specific API endpoint

Suppose Grafana shows latency spikes for:

/api/orders
Search for logs related to that endpoint:

message:"/api/orders"
or

route:"/api/orders"
Example logs you might see:

Fetching orders from database
Database timeout
Now you know which API call is failing.

4. Search for a specific error message

Once you discover an error string, search the entire log dataset for it.

"Database timeout"
This shows how frequently the problem occurs.

Example pattern:

10:31 Database timeout
10:32 Database timeout
10:33 Database timeout
That tells you the failure is ongoing, not a single event.

5. Investigate slow requests

Sometimes the problem isn't errors—it’s performance degradation.

Search for keywords related to slow operations.

timeout
or

slow
Example logs:

Query execution slow: 3.9s
Database timeout after 4s
This often points toward database bottlenecks or external service latency.

6. Search logs by status code

You can isolate failing requests by HTTP status.

status:500
or

http.status_code:500
You may see something like:

GET /api/orders → 500
GET /api/orders → 500
GET /api/orders → 500
Now you confirm the API is consistently failing.

7. Trace a single request using trace_id

If your system includes tracing (like Jaeger), logs may include a trace ID.

Example log record:

trace_id: 7f92c4a5
Search for that trace ID:

trace_id:7f92c4a5
This displays every log associated with one specific request.

You can then open Jaeger and search for the same trace ID to see the full request path across services.

How experienced engineers combine these queries

During an incident, the workflow usually looks like this:

Alert fires in Prometheus.

Grafana shows error spikes for /api/orders.

In Kibana you search:

route:"/api/orders"
Logs show:

Database timeout
Search again:

"Database timeout"
You notice every failure contains a trace ID.

Copy that ID into Jaeger to see exactly where the request failed.

That is the full observability loop.

A simple way to remember the investigative flow:

Metrics → Logs → Traces
Prometheus → Kibana → Jaeger
Metrics detect the problem.
Logs explain the problem.
Traces pinpoint the location of the problem.

Since you’ve been building Kubernetes clusters and working with Prometheus already, the next very powerful skill is learning what dashboards DevOps teams actually build in Grafana. There are about six dashboards almost every production platform uses, and knowing them makes observability much easier. If you want, I can walk you through those as well.


Yes, please

When teams run production systems, they rarely build dozens of random dashboards. Most mature DevOps/SRE teams focus on a small set of critical dashboards that quickly answer operational questions during an incident. I’ll walk you through six dashboards that appear in many real environments. Imagine you are opening Grafana during an alert and moving between these panels to understand the situation.

1. Service Health Dashboard

This is usually the first dashboard engineers open when something breaks. It gives a quick overview of whether the service is functioning normally.

Typical panels include:

• Request rate (requests per second)
• Error rate
• Average latency
• CPU usage
• Memory usage

Example Prometheus queries used in this dashboard:

Request rate:

rate(http_requests_total[1m])
Error rate:

rate(http_requests_total{status="500"}[1m])
Latency (95th percentile):

histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m]))
If an alert fires, this dashboard quickly tells you:

Is traffic increasing?

Are errors rising?

Is the service slowing down?

It provides the first big-picture view.

2. Infrastructure Dashboard

Sometimes the application is fine but the infrastructure is failing.

This dashboard focuses on the host or container resources.

Typical panels:

• CPU utilization
• Memory usage
• Disk I/O
• Network traffic
• Container restarts

Example queries:

CPU usage:

rate(process_cpu_seconds_total[1m])
Memory usage:

process_resident_memory_bytes
If CPU suddenly spikes to 100%, you immediately suspect:

resource exhaustion

infinite loops

runaway workloads

3. API Performance Dashboard

This dashboard focuses entirely on endpoint performance.

Panels usually show latency per API endpoint.

Example query:

histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m])) by (route)
Example visualization:

/api/orders     3.8s
/api/users      0.2s
/api/products   0.3s
Now you know exactly which endpoint is slow.

This is extremely valuable during outages.

4. Error Analysis Dashboard

This dashboard isolates failures in the system.

Panels include:

• HTTP 4xx rate
• HTTP 5xx rate
• Failed database queries
• Failed external API calls

Example query:

rate(http_requests_total{status=~"5.."}[1m])
This dashboard answers:

Are users seeing failures?

Which services are producing errors?

It is often used together with alerting rules.

5. Dependency Dashboard

Modern applications depend on other services:

• databases
• message queues
• external APIs
• microservices

This dashboard monitors those dependencies.

Example panels:

Database query latency:

histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[1m]))
Cache hit rate:

cache_hits_total / (cache_hits_total + cache_misses_total)
If this dashboard shows degradation, you know the problem is not the application itself but a dependency.

6. Capacity & Traffic Trends Dashboard

This dashboard helps teams plan for growth.

Panels typically show:

• traffic over time
• CPU usage over weeks
• request growth
• peak load times

Example query:

sum(rate(http_requests_total[5m]))
Teams use this dashboard to answer questions like:

When do traffic spikes happen?

Are we approaching capacity limits?

This dashboard is less about incidents and more about long-term reliability planning.

How these dashboards work together during an incident

Imagine users report slow API responses.

An engineer typically investigates like this:

Service Health Dashboard

You notice latency increasing.

API Performance Dashboard

You discover the problem occurs on:

/api/orders
Error Dashboard

You see many HTTP 500 errors.

Infrastructure Dashboard

CPU and memory look normal.

Dependency Dashboard

Database query latency spikes to 4 seconds.

Now you know the root cause is likely database performance.

You would then open Kibana logs and Jaeger traces to confirm.

A useful way to remember this investigative flow is:

Grafana dashboards → identify the symptom
Kibana logs → identify the error
Jaeger traces → identify the location
Each tool gives a different layer of visibility.

Since you’ve already been working with Prometheus and Kubernetes, one more skill would make your observability knowledge significantly stronger: understanding the “Four Golden Signals” used by SRE teams. They are the core metrics almost every production monitoring system tracks. If you’d like, I can explain those next and show exactly how they map to Prometheus queries and Grafana panels.


Yes please

In many production environments, monitoring revolves around a small set of signals that quickly reveal whether a service is healthy. These are often called the Four Golden Signals, a concept popularized by the SRE practices at Google. They are extremely practical because almost every outage can be detected by observing these four metrics.

The signals are Latency, Traffic, Errors, and Saturation. When DevOps or SRE teams design dashboards in Grafana using data from Prometheus, these four almost always appear as the primary panels.

Let’s walk through them carefully and connect them to the tools you’re learning.

1. Latency — How long requests take

Latency measures the time it takes for the system to respond to a request. If users complain that “the site feels slow,” latency is usually the first signal that reveals the problem.

For your Node.js service, Prometheus collects request duration metrics. Engineers usually monitor the 95th percentile latency, which represents the experience of most users while ignoring rare outliers.

A common Prometheus query looks like this:

histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m]))
If that value suddenly jumps from:

200 ms → 4 seconds
you immediately know something is slowing the system down. That could be a slow database, overloaded CPU, or a failing dependency.

During an investigation, latency usually tells you the first symptom.

2. Traffic — How many requests the system receives

Traffic represents the number of incoming requests per second. It answers the question: How much load is the system handling?

In Prometheus, you might query request rate like this:

rate(http_requests_total[1m])
This metric helps identify scenarios such as:

sudden traffic spikes

denial-of-service attacks

marketing campaigns generating heavy load

autoscaling triggers

For example, if traffic jumps from:

200 requests/sec → 5000 requests/sec
and latency increases at the same time, you know the system may simply be overloaded.

3. Errors — How many requests fail

Errors measure the rate of failed requests. In web services this often means HTTP 5xx responses, which indicate server-side failures.

A typical Prometheus query is:

rate(http_requests_total{status=~"5.."}[1m])
If the error rate suddenly increases, users are actively experiencing failures.

Example pattern during an outage:

Latency rising
Error rate rising
That combination almost always signals service instability.

This is the signal most commonly used for alerting rules.

4. Saturation — How close the system is to capacity

Saturation measures how “full” your resources are. It tells you whether the system is running out of capacity.

Common examples include:

CPU usage

rate(process_cpu_seconds_total[1m])
Memory usage

process_resident_memory_bytes
Queue length

message_queue_depth
If CPU usage stays near 100%, or memory usage keeps climbing, the system may soon become unstable.

This signal answers the question: Are we about to hit our limits?

How the Four Golden Signals work together

During an incident, engineers mentally correlate these four signals.

Example investigation:

Users report the API is slow.

In Grafana you observe:

Traffic

Stable
Latency

200 ms → 4 seconds
Errors

Increasing
Saturation

CPU normal
Memory normal
From this pattern you might suspect a slow external dependency, like a database or third-party API.

You would then move to logs in Kibana (from the Elasticsearch stack) to inspect error messages, and finally open traces in Jaeger to identify exactly where the delay occurs.

This investigative ladder becomes second nature for experienced engineers.

Why these signals are powerful

Almost every production dashboard eventually maps back to these four questions:

Are requests slow? → Latency

How much load do we have? → Traffic

Are users seeing failures? → Errors

Are we running out of resources? → Saturation

If you understand those signals, you can interpret almost any monitoring dashboard.

Since you’ve been building Kubernetes clusters and learning Prometheus already, the next very practical step would be learning the exact Prometheus alert rules companies use to detect incidents automatically (for example: high error rate, high latency, container crash loops). I can show you several real alert rules and explain why they matter in production.


Yes

When monitoring is done well, engineers don’t stare at dashboards all day. Instead, the system automatically raises alerts when conditions indicate trouble. In many teams, these alerts are defined in Prometheus alert rules, and they are sent to systems like Alertmanager, which then notifies engineers through Slack, email, or paging tools. The alerts are typically visualized or managed through dashboards in Grafana.

Below are several very common alert rules used in real environments. These rules are closely tied to the Golden Signals we discussed.

1. High Error Rate Alert

This detects when a service begins returning too many server errors.

Example rule:

- alert: HighHttpErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
  for: 2m
  labels:
    severity: critical
  annotations:
    description: High HTTP 5xx error rate detected
What this means:

If more than 5% of requests fail for 2 minutes, the alert triggers.

Typical investigation path:

Prometheus → check error rate
Grafana → see which endpoint is failing
Logs → inspect error messages
Traces → locate failing dependency

2. High Latency Alert

This detects slow responses before users complain.

Example rule:

- alert: HighRequestLatency
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
  for: 5m
  labels:
    severity: warning
  annotations:
    description: Request latency above 2 seconds
Meaning:

If the 95th percentile latency exceeds 2 seconds for 5 minutes, the alert fires.

Typical causes:

• slow database queries
• overloaded services
• slow third-party APIs

3. High CPU Usage Alert

Infrastructure issues often appear as CPU saturation.

Example rule:

- alert: HighCPUUsage
  expr: rate(process_cpu_seconds_total[1m]) > 0.8
  for: 3m
  labels:
    severity: warning
This alert indicates the application is consuming excessive CPU.

Possible causes include:

• runaway loops
• heavy data processing
• traffic spikes

4. Memory Usage Alert

Memory leaks or container misconfiguration can crash services.

Example rule:

- alert: HighMemoryUsage
  expr: process_resident_memory_bytes > 500000000
  for: 5m
  labels:
    severity: warning
This warns that the application is approaching memory limits.

If unchecked, it could cause:

• container restarts
• Kubernetes OOM kills

5. Pod Restart Alert (Kubernetes environments)

Since you’ve been working with Kubernetes clusters, this alert is especially important.

Example rule:

- alert: PodRestartingFrequently
  expr: increase(kube_pod_container_status_restarts_total[10m]) > 3
  for: 5m
  labels:
    severity: critical
This means a container restarted more than three times in ten minutes.

Possible causes:

• application crashes
• configuration errors
• failing health checks

6. Service Down Alert

This is one of the simplest but most critical alerts.

Example rule:

- alert: ServiceDown
  expr: up == 0
  for: 1m
  labels:
    severity: critical
This means Prometheus cannot scrape the service.

Possible reasons include:

• container stopped
• network issues
• service crash

What happens after an alert fires

Once Prometheus detects a rule violation, it sends the alert to Alertmanager. Alertmanager then routes the notification to the appropriate team.

Example flow:

Prometheus detects issue
       ↓
Alertmanager receives alert
       ↓
Notification sent to Slack / PagerDuty
       ↓
Engineer investigates using Grafana
       ↓
Logs checked in Kibana
       ↓
Trace inspected in Jaeger
This workflow allows engineers to respond quickly without manually watching dashboards.

Example real incident flow

Imagine the following sequence:

Alert:

HighHttpErrorRate
You open Grafana and see errors coming from:

/api/orders
You then search logs in Kibana and find:

Database timeout
Next, you open Jaeger traces and discover:

API → database query → timeout
From this chain of evidence, the root cause becomes clear: the database dependency is failing.

Understanding these alert patterns is powerful because they mirror what many SRE and DevOps teams actually deploy in production systems. If you can explain how alerts trigger, how metrics guide the investigation, and how logs and traces confirm the root cause, you demonstrate a strong operational mindset.

If you like, we can take this one step further and build a complete observability lab on Kubernetes using Prometheus, Grafana, and Jaeger—something that aligns closely with the cluster work you’ve been doing with kubeadm and EKS.


Yes

Since you already have strong Kubernetes exposure (you’ve built clusters with kubeadm, KIND, and EKS), the best learning step is to create a small Kubernetes observability lab that mirrors what many companies actually run.

The idea is simple: deploy an application in Kubernetes, then observe it using:

Prometheus → metrics collection

Grafana → dashboards

Jaeger → distributed tracing

Elasticsearch + Kibana → logs

We’ll walk through this like a real DevOps engineer setting up observability in a cluster.

1. Architecture of the Lab
Your Kubernetes cluster will look like this:

Client Request
      │
      ▼
Node.js Application (Pod)
      │
 ┌────┼───────────────┐
 │    │               │
 ▼    ▼               ▼
Prometheus      Elasticsearch     Jaeger
(metrics)         (logs)          (traces)
 │                  │
 ▼                  ▼
Grafana           Kibana
This gives you full observability:

Metrics + Logs + Traces.

2. Create a Kubernetes Namespace
Always isolate monitoring tools in their own namespace.

kubectl create namespace observability
Check it:

kubectl get ns
3. Install Prometheus (Using Helm)
In real environments Prometheus is usually deployed using Helm charts.

Install Helm if needed:

curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
Add the monitoring repository:

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
Install the Prometheus stack:

helm install monitoring prometheus-community/kube-prometheus-stack \
-n observability
This installs several components automatically:

Prometheus

Grafana

Alertmanager

Node Exporter

Kubernetes metrics collectors

Check the pods:

kubectl get pods -n observability
4. Access Grafana
Find the service:

kubectl get svc -n observability
Port forward Grafana:

kubectl port-forward svc/monitoring-grafana 3000:80 -n observability
Open:

http://localhost:3000
Default login:

admin
prom-operator
Grafana will already contain dashboards for:

Kubernetes nodes

Pods

CPU usage

Memory usage

These dashboards come automatically from the kube-prometheus-stack.

5. Deploy the Demo Application
Create a deployment file.

app-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: demo
  template:
    metadata:
      labels:
        app: demo
    spec:
      containers:
      - name: demo-app
        image: node:20
        command: ["node","-e"]
        args:
          - |
            const http=require('http');
            http.createServer((req,res)=>{
              if(Math.random()>0.8){
                res.statusCode=500;
                res.end("Error");
              }else{
                res.end("Hello");
              }
            }).listen(3000);
        ports:
        - containerPort: 3000
Apply it:

kubectl apply -f app-deployment.yaml
Check pods:

kubectl get pods
6. Expose the Service
Create a service.

apiVersion: v1
kind: Service
metadata:
  name: demo-service
spec:
  selector:
    app: demo
  ports:
  - port: 80
    targetPort: 3000
Apply:

kubectl apply -f service.yaml
7. Generate Traffic
Port forward:

kubectl port-forward svc/demo-service 8080:80
Send requests:

while true; do curl localhost:8080; done
Some requests will return 500 errors.

Perfect for monitoring.

8. Observe Metrics in Grafana
Open Grafana dashboards.

You will see metrics like:

Request rate
CPU usage
Memory usage
Pod restarts
Prometheus automatically scrapes metrics from Kubernetes components.

9. Install Jaeger (Tracing)
Install Jaeger using Helm.

helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo update
Install:

helm install jaeger jaegertracing/jaeger -n observability
Check pods:

kubectl get pods -n observability
Access Jaeger UI:

kubectl port-forward svc/jaeger-query 16686:16686 -n observability
Open:

http://localhost:16686
This interface will display distributed request traces.

10. Logs with Elasticsearch and Kibana
Install the logging stack.

Add Elastic Helm repo:

helm repo add elastic https://helm.elastic.co
helm repo update
Install Elasticsearch:

helm install elasticsearch elastic/elasticsearch -n observability
Install Kibana:

helm install kibana elastic/kibana -n observability
Port forward Kibana:

kubectl port-forward svc/kibana-kibana 5601:5601 -n observability
Open:

http://localhost:5601
Now you can search logs produced by containers.

11. Simulated Incident Investigation
Imagine this alert triggers:

High HTTP 500 rate
Your investigation might follow this flow:

Grafana

You see the error rate increasing.

Prometheus metrics

Latency is also rising.

Kibana logs

You search:

error
Result:

Database timeout
Jaeger tracing

Trace shows:

API request
 ↓
Database call
 ↓
Timeout
Root cause identified.

12. Why This Lab Is Valuable
This lab demonstrates the complete observability workflow used in real companies.

You can confidently explain:

metrics monitoring

log aggregation

distributed tracing

incident investigation

This fits perfectly with your Kubernetes practice environment.

If you'd like, I can also show you something extremely useful for DevOps engineers:

The “Observability Maturity Model” used by companies like Netflix and Google—it explains how organizations evolve from basic monitoring to advanced observability. It will also help you answer senior-level DevOps interview questions.
