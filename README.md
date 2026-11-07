# Contract Lifecycle & Approval Management System

A DevOps project: a Node.js API with a rule-based approval workflow,
delivered with CI/CD, GitOps, and monitoring on Kubernetes.

## Features
- JWT login with roles (Requester, Legal, Finance, Admin)
- Contract workflow: Draft, In Review, Approved
- Contracts above 50,000 need both Legal and Finance approval
- Full audit trail
- Prometheus metrics at /metrics

## Architecture
GitHub, GitHub Actions (test, build, push image to GHCR),
ArgoCD (GitOps) deploying to Kubernetes (kind),
PostgreSQL, Prometheus and Grafana for monitoring.

## Run locally
docker compose up --build -d
Open http://localhost:3000/health

## Pipeline
1. A push to main runs GitHub Actions: npm test, then Docker build and push.
2. ArgoCD watches the k8s folder and syncs changes into the cluster.
3. Prometheus scrapes /metrics through a ServiceMonitor.
4. Alert rules watch error rate and latency.

## Results
- Zero-downtime rolling updates
- Self-healing: manual changes are reverted by ArgoCD
- Incident: a duplicate registration crashed a pod; fixed and redeployed through the pipeline