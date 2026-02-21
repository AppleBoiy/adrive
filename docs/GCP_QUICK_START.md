# GCP Deployment Quick Start

Deploy ADrive to Google Cloud Platform in minutes.

## Prerequisites

- Google Cloud account
- `gcloud` CLI installed
- Docker installed

## Quick Deploy

### Option 1: Automated Script

```bash
# Set your project ID
export GCP_PROJECT_ID=your-project-id

# Run deployment script
./scripts/deploy-gcp.sh
```

Choose option:
1. Cloud Run (easiest, serverless)
2. Compute Engine (VM with persistent storage)
3. GKE (Kubernetes, high availability)

### Option 2: Manual Cloud Run Deploy

```bash
# 1. Setup
gcloud config set project your-project-id
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# 2. Build and push
gcloud builds submit --tag gcr.io/your-project-id/adrive-backend backend/
gcloud builds submit --tag gcr.io/your-project-id/adrive-frontend frontend/

# 3. Deploy backend
gcloud run deploy adrive-backend \
  --image gcr.io/your-project-id/adrive-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 5001

# 4. Deploy frontend
gcloud run deploy adrive-frontend \
  --image gcr.io/your-project-id/adrive-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 80
```

### Option 3: Compute Engine (Persistent Storage)

```bash
# 1. Create VM
gcloud compute instances create adrive-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=cos-stable \
  --image-project=cos-cloud \
  --boot-disk-size=50GB

# 2. SSH to VM
gcloud compute ssh adrive-vm --zone=us-central1-a

# 3. Install Docker (on VM)
sudo yum install -y docker
sudo systemctl start docker

# 4. Deploy (on VM)
git clone <your-repo>
cd adrive
./start.sh
```

## Cost Estimates

| Option | Monthly Cost | Best For |
|--------|-------------|----------|
| Cloud Run | $5-20 | Low traffic, serverless |
| Compute Engine | $30-50 | Persistent storage |
| GKE | $75-150 | High availability |

## Access Your Deployment

### Cloud Run
```bash
# Get URLs
gcloud run services list
```

### Compute Engine
```bash
# Get IP
gcloud compute instances describe adrive-vm \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'

# Access at: http://IP:3000
```

## Next Steps

1. Configure custom domain
2. Setup SSL certificate
3. Enable monitoring
4. Configure backups

See [GCP_DEPLOYMENT.md](GCP_DEPLOYMENT.md) for complete guide.

## Troubleshooting

### View Logs
```bash
# Cloud Run
gcloud run services logs read adrive-backend

# Compute Engine
gcloud compute ssh adrive-vm
docker-compose logs -f
```

### Common Issues

**Issue**: Permission denied
```bash
gcloud auth login
gcloud config set project your-project-id
```

**Issue**: API not enabled
```bash
gcloud services enable run.googleapis.com
```

## Support

- [Complete GCP Guide](GCP_DEPLOYMENT.md)
- [GCP Documentation](https://cloud.google.com/docs)
- [Cloud Run Docs](https://cloud.google.com/run/docs)
