#!/bin/bash

# ADrive GCP Deployment Script
# Deploys ADrive to Google Cloud Platform

set -e

echo ""
echo "ADrive - GCP Deployment"
echo "======================="
echo ""

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-adrive-prod}"
REGION="${GCP_REGION:-us-central1}"
ZONE="${GCP_ZONE:-us-central1-a}"
BUCKET_NAME="${GCS_BUCKET:-adrive-storage}"

# Check prerequisites
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found"
    echo "   Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found"
    exit 1
fi

echo "✓ Prerequisites met"
echo ""

# Deployment options
echo "Choose deployment option:"
echo "  1) Cloud Run (Serverless, easiest)"
echo "  2) Compute Engine (VM with persistent storage)"
echo "  3) GKE (Kubernetes, high availability)"
echo ""
read -p "Enter option [1-3]: " OPTION

case $OPTION in
    1)
        echo ""
        echo "Deploying to Cloud Run..."
        echo ""
        
        # Setup project
        echo "Setting up GCP project..."
        gcloud config set project $PROJECT_ID
        
        # Enable APIs
        echo "Enabling required APIs..."
        gcloud services enable run.googleapis.com \
          cloudbuild.googleapis.com \
          artifactregistry.googleapis.com
        
        # Create Artifact Registry
        echo "Creating Artifact Registry..."
        gcloud artifacts repositories create adrive \
          --repository-format=docker \
          --location=$REGION \
          --description="ADrive container images" \
          2>/dev/null || echo "Repository already exists"
        
        # Configure Docker
        gcloud auth configure-docker ${REGION}-docker.pkg.dev
        
        # Build and push images
        echo "Building and pushing images..."
        docker-compose build
        
        docker tag adrive-backend:latest \
          ${REGION}-docker.pkg.dev/${PROJECT_ID}/adrive/backend:latest
        docker tag adrive-frontend:latest \
          ${REGION}-docker.pkg.dev/${PROJECT_ID}/adrive/frontend:latest
        
        docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/adrive/backend:latest
        docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/adrive/frontend:latest
        
        # Deploy backend
        echo "Deploying backend..."
        gcloud run deploy adrive-backend \
          --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/adrive/backend:latest \
          --platform=managed \
          --region=$REGION \
          --allow-unauthenticated \
          --port=5001 \
          --memory=512Mi \
          --set-env-vars="DEV_MODE=false,BUCKET_NAME=${BUCKET_NAME},PORT=5001" \
          --min-instances=0 \
          --max-instances=10
        
        # Deploy frontend
        echo "Deploying frontend..."
        gcloud run deploy adrive-frontend \
          --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/adrive/frontend:latest \
          --platform=managed \
          --region=$REGION \
          --allow-unauthenticated \
          --port=80 \
          --memory=256Mi \
          --min-instances=0 \
          --max-instances=10
        
        # Get URLs
        BACKEND_URL=$(gcloud run services describe adrive-backend \
          --region=$REGION --format='value(status.url)')
        FRONTEND_URL=$(gcloud run services describe adrive-frontend \
          --region=$REGION --format='value(status.url)')
        
        echo ""
        echo "✓ Deployment complete!"
        echo ""
        echo "URLs:"
        echo "  Frontend: $FRONTEND_URL"
        echo "  Backend:  $BACKEND_URL"
        echo ""
        ;;
        
    2)
        echo ""
        echo "Deploying to Compute Engine..."
        echo ""
        
        # Create VM
        echo "Creating VM instance..."
        gcloud compute instances create adrive-vm \
          --zone=$ZONE \
          --machine-type=e2-medium \
          --image-family=cos-stable \
          --image-project=cos-cloud \
          --boot-disk-size=50GB \
          --tags=http-server,https-server \
          2>/dev/null || echo "VM already exists"
        
        # Configure firewall
        gcloud compute firewall-rules create allow-adrive \
          --allow=tcp:80,tcp:443,tcp:3000,tcp:5001 \
          --target-tags=http-server \
          2>/dev/null || echo "Firewall rule already exists"
        
        # Get external IP
        EXTERNAL_IP=$(gcloud compute instances describe adrive-vm \
          --zone=$ZONE --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
        
        echo ""
        echo "✓ VM created!"
        echo ""
        echo "Next steps:"
        echo "  1. SSH to VM: gcloud compute ssh adrive-vm --zone=$ZONE"
        echo "  2. Install Docker and Docker Compose"
        echo "  3. Clone repository and run: ./start.sh"
        echo ""
        echo "VM IP: $EXTERNAL_IP"
        echo "Access: http://$EXTERNAL_IP:3000"
        echo ""
        ;;
        
    3)
        echo ""
        echo "Deploying to GKE..."
        echo ""
        
        # Create cluster
        echo "Creating GKE cluster..."
        gcloud container clusters create adrive-cluster \
          --zone=$ZONE \
          --num-nodes=2 \
          --machine-type=e2-medium \
          --enable-autoscaling \
          --min-nodes=1 \
          --max-nodes=5 \
          2>/dev/null || echo "Cluster already exists"
        
        # Get credentials
        gcloud container clusters get-credentials adrive-cluster --zone=$ZONE
        
        echo ""
        echo "✓ Cluster created!"
        echo ""
        echo "Next steps:"
        echo "  1. Create Kubernetes manifests (see docs/GCP_DEPLOYMENT.md)"
        echo "  2. Apply: kubectl apply -f k8s/deployment.yaml"
        echo "  3. Get IP: kubectl get service adrive-frontend"
        echo ""
        ;;
        
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo "See docs/GCP_DEPLOYMENT.md for complete guide"
echo ""
