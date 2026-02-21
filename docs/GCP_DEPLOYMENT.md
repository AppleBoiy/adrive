# Google Cloud Platform Deployment Guide

Deploy ADrive on Google Cloud Platform using Cloud Run, Compute Engine, or GKE.

## Option 1: Cloud Run (Recommended for Simplicity)

Cloud Run is serverless, auto-scales, and easiest to deploy.

### Prerequisites
- Google Cloud account
- `gcloud` CLI installed
- Docker images built

### Step 1: Setup GCP Project

```bash
# Login to GCP
gcloud auth login

# Create project (or use existing)
gcloud projects create adrive-prod --name="ADrive Production"

# Set project
gcloud config set project adrive-prod

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Step 2: Create Artifact Registry

```bash
# Create repository
gcloud artifacts repositories create adrive \
  --repository-format=docker \
  --location=us-central1 \
  --description="ADrive container images"

# Configure Docker
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### Step 3: Build and Push Images

```bash
# Tag images for Artifact Registry
docker tag adrive-backend:latest \
  us-central1-docker.pkg.dev/adrive-prod/adrive/backend:latest

docker tag adrive-frontend:latest \
  us-central1-docker.pkg.dev/adrive-prod/adrive/frontend:latest

# Push images
docker push us-central1-docker.pkg.dev/adrive-prod/adrive/backend:latest
docker push us-central1-docker.pkg.dev/adrive-prod/adrive/frontend:latest
```

### Step 4: Create Cloud Storage Bucket

```bash
# Create bucket for file storage
gsutil mb -l us-central1 gs://adrive-storage

# Set bucket permissions (if needed)
gsutil iam ch allUsers:objectViewer gs://adrive-storage
```

### Step 5: Deploy Backend to Cloud Run

```bash
# Deploy backend
gcloud run deploy adrive-backend \
  --image=us-central1-docker.pkg.dev/research-os-487706/adrive/backend:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=5001 \
  --memory=512Mi \
  --set-env-vars="DEV_MODE=false,BUCKET_NAME=adrive-storage,PORT=5001" \
  --min-instances=0 \
  --max-instances=10

# Get backend URL
gcloud run services describe adrive-backend \
  --region=us-central1 \
  --format='value(status.url)'
```

### Step 6: Deploy Frontend to Cloud Run

```bash
# Deploy frontend
gcloud run deploy adrive-frontend \
  --image=us-central1-docker.pkg.dev/adrive-prod/adrive/frontend:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=80 \
  --memory=256Mi \
  --min-instances=0 \
  --max-instances=10

# Get frontend URL
gcloud run services describe adrive-frontend \
  --region=us-central1 \
  --format='value(status.url)'
```

### Step 7: Configure Custom Domain (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service=adrive-frontend \
  --domain=adrive.yourdomain.com \
  --region=us-central1
```

### Limitations of Cloud Run
- No persistent disk (database resets on restart)
- Use Cloud SQL for persistent database
- Or use Compute Engine/GKE instead

---

## Option 2: Compute Engine (VM with Persistent Storage)

Best for persistent storage and full control.

### Step 1: Create VM Instance

```bash
# Create VM with Docker
gcloud compute instances create adrive-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=cos-stable \
  --image-project=cos-cloud \
  --boot-disk-size=50GB \
  --tags=http-server,https-server

# Configure firewall
gcloud compute firewall-rules create allow-http \
  --allow=tcp:80,tcp:443,tcp:3000,tcp:5001 \
  --target-tags=http-server
```

### Step 2: SSH into VM

```bash
# SSH to VM
gcloud compute ssh adrive-vm --zone=us-central1-a
```

### Step 3: Install Docker and Docker Compose

```bash
# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again
exit
gcloud compute ssh adrive-vm --zone=us-central1-a
```

### Step 4: Deploy Application

```bash
# Clone repository
git clone <your-repo-url>
cd adrive

# Create .env file
cat > backend/.env << EOF
PORT=5001
DEV_MODE=false
BUCKET_NAME=adrive-storage
SESSION_SECRET=$(openssl rand -hex 32)
EOF

# Add service account (if using GCS)
# Upload your service-account.json to the VM

# Start application
docker-compose up -d

# Check status
docker-compose ps
```

### Step 5: Setup Nginx Reverse Proxy (Optional)

```bash
# Install Nginx
sudo yum install -y nginx

# Configure Nginx
sudo tee /etc/nginx/conf.d/adrive.conf << 'EOF'
server {
    listen 80;
    server_name adrive.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 6: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d adrive.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot-renew.timer
```

---

## Option 3: Google Kubernetes Engine (GKE)

Best for high availability and scalability.

### Step 1: Create GKE Cluster

```bash
# Create cluster
gcloud container clusters create adrive-cluster \
  --zone=us-central1-a \
  --num-nodes=2 \
  --machine-type=e2-medium \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=5

# Get credentials
gcloud container clusters get-credentials adrive-cluster \
  --zone=us-central1-a
```

### Step 2: Create Kubernetes Manifests

Create `k8s/deployment.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: adrive
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: adrive-config
  namespace: adrive
data:
  PORT: "5001"
  DEV_MODE: "false"
  BUCKET_NAME: "adrive-storage"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: adrive-backend
  namespace: adrive
spec:
  replicas: 2
  selector:
    matchLabels:
      app: adrive-backend
  template:
    metadata:
      labels:
        app: adrive-backend
    spec:
      containers:
      - name: backend
        image: us-central1-docker.pkg.dev/adrive-prod/adrive/backend:latest
        ports:
        - containerPort: 5001
        envFrom:
        - configMapRef:
            name: adrive-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: adrive-backend
  namespace: adrive
spec:
  selector:
    app: adrive-backend
  ports:
  - port: 5001
    targetPort: 5001
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: adrive-frontend
  namespace: adrive
spec:
  replicas: 2
  selector:
    matchLabels:
      app: adrive-frontend
  template:
    metadata:
      labels:
        app: adrive-frontend
    spec:
      containers:
      - name: frontend
        image: us-central1-docker.pkg.dev/adrive-prod/adrive/frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: adrive-frontend
  namespace: adrive
spec:
  selector:
    app: adrive-frontend
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

### Step 3: Deploy to GKE

```bash
# Apply manifests
kubectl apply -f k8s/deployment.yaml

# Check status
kubectl get pods -n adrive
kubectl get services -n adrive

# Get external IP
kubectl get service adrive-frontend -n adrive
```

---

## Cost Optimization

### Cloud Run
- **Cost**: ~$5-20/month for low traffic
- **Free tier**: 2 million requests/month
- **Best for**: Low to medium traffic

### Compute Engine
- **Cost**: ~$30-50/month (e2-medium)
- **Sustained use discount**: Up to 30%
- **Best for**: Persistent storage needs

### GKE
- **Cost**: ~$75-150/month (2 nodes)
- **Cluster management**: $0.10/hour
- **Best for**: High availability, scaling

### Cost Saving Tips

```bash
# Use preemptible VMs (up to 80% cheaper)
gcloud compute instances create adrive-vm \
  --preemptible \
  --machine-type=e2-small

# Use committed use discounts (up to 57% off)
# Purchase 1 or 3 year commitments

# Set up budget alerts
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="ADrive Budget" \
  --budget-amount=50USD
```

---

## Monitoring and Logging

### Enable Cloud Monitoring

```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# Create uptime check
gcloud monitoring uptime-checks create http adrive-check \
  --display-name="ADrive Uptime" \
  --resource-type=uptime-url \
  --host=adrive.yourdomain.com \
  --path=/
```

### Setup Alerts

```bash
# Create alert policy
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="ADrive Down Alert" \
  --condition-display-name="Uptime check failed" \
  --condition-threshold-value=1
```

---

## Backup and Disaster Recovery

### Backup Database

```bash
# Backup to Cloud Storage
docker-compose exec backend sh -c \
  "sqlite3 /app/data/filemanager.db .dump" | \
  gsutil cp - gs://adrive-backups/db-$(date +%Y%m%d).sql

# Automated daily backup (cron)
0 2 * * * /path/to/backup-script.sh
```

### Restore Database

```bash
# Download backup
gsutil cp gs://adrive-backups/db-20240220.sql /tmp/

# Restore
docker-compose exec backend sh -c \
  "sqlite3 /app/data/filemanager.db" < /tmp/db-20240220.sql
```

---

## Security Best Practices

1. **Use Secret Manager for sensitive data**
```bash
# Store secrets
echo -n "your-secret" | gcloud secrets create session-secret --data-file=-

# Access in Cloud Run
gcloud run services update adrive-backend \
  --update-secrets=SESSION_SECRET=session-secret:latest
```

2. **Enable Cloud Armor (DDoS protection)**
3. **Use Identity-Aware Proxy (IAP) for authentication**
4. **Enable VPC Service Controls**
5. **Regular security scans**

---

## Troubleshooting

### Check Logs
```bash
# Cloud Run logs
gcloud run services logs read adrive-backend --region=us-central1

# Compute Engine logs
gcloud compute ssh adrive-vm --zone=us-central1-a
docker-compose logs -f
```

### Common Issues

**Issue**: Out of memory
```bash
# Increase memory
gcloud run services update adrive-backend \
  --memory=1Gi --region=us-central1
```

**Issue**: Cold starts
```bash
# Set minimum instances
gcloud run services update adrive-backend \
  --min-instances=1 --region=us-central1
```

---

## Next Steps

1. Choose deployment option (Cloud Run, Compute Engine, or GKE)
2. Follow the steps for your chosen option
3. Configure custom domain and SSL
4. Set up monitoring and alerts
5. Configure automated backups
6. Test the deployment thoroughly

## Support

- [GCP Documentation](https://cloud.google.com/docs)
- [Cloud Run Docs](https://cloud.google.com/run/docs)
- [Compute Engine Docs](https://cloud.google.com/compute/docs)
- [GKE Docs](https://cloud.google.com/kubernetes-engine/docs)
