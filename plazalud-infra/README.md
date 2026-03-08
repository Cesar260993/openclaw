# 🏗️ Voltom-Tech/plazalud-infra

Infraestructura como Código (IaC) para las aplicaciones de **PlazaLud** usando **Terraform** en **AWS**.

---

## 📋 Descripción

Este repositorio contiene la infraestructura definida como código para deployar las aplicaciones de PlazaLud, principalmente construidas en **JavaScript** y **TypeScript**, conectadas a bases de datos **MongoDB** en AWS.

### Objetivo

- ✅ **Automatizar** el deploy de infraestructura en AWS
- ✅ **Versionar** la infraestructura junto con el código
- ✅ **Replicar** ambientes (dev, staging, production)
- ✅ **Escalar** automáticamente según demanda
- ✅ **Asegurar** mejores prácticas de seguridad

---

## 🛠️ Tecnologías

| Categoría | Tecnología |
|-----------|------------|
| **IaC** | Terraform |
| **Cloud** | AWS (Amazon Web Services) |
| **Lenguajes** | JavaScript, TypeScript |
| **Base de Datos** | MongoDB (Atlas / DocumentDB) |
| **Contenedores** | Docker, ECS/Fargate |
| **CI/CD** | GitHub Actions |
| **Monitoreo** | CloudWatch, X-Ray |

---

## 📁 Estructura del Repositorio

```
plazalud-infra/
├── terraform/
│   ├── environments/
│   │   ├── dev/
│   │   ├── staging/
│   │   └── production/
│   ├── modules/
│   │   ├── vpc/
│   │   ├── ec2/
│   │   ├── rds/
│   │   ├── s3/
│   │   └── lambda/
│   └── backend.tf
├── scripts/
│   ├── bootstrap.sh
│   └── deploy.sh
├── docs/
│   ├── architecture.md
│   └── runbooks/
├── .github/
│   └── workflows/
│       └── terraform.yml
├── .terraformignore
├── README.md
└── LICENSE
```

---

## 🚀 Quick Start

### Prerrequisitos

```bash
# Terraform >= 1.5
terraform --version

# AWS CLI configurado
aws configure

# Node.js (para apps)
node --version
npm --version
```

### Setup Inicial

```bash
# 1. Clonar repositorio
git clone https://github.com/Voltom-Tech/plazalud-infra.git
cd plazalud-infra

# 2. Inicializar Terraform
cd terraform/environments/dev
terraform init

# 3. Planear cambios
terraform plan

# 4. Aplicar infraestructura
terraform apply
```

---

## 🏗️ Arquitectura

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                         AWS Cloud                           │
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │  CloudFront │ ──► │  ALB/NLB    │ ──► │   ECS/Fargate│   │
│  │   (CDN)     │     │  (Load Bal) │     │   (App)      │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                              │              │
│                                              ▼              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   S3        │     │  RDS/Atlas  │     │   ElastiCache│   │
│  │  (Assets)   │     │  (MongoDB)  │     │   (Redis)    │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Servicios AWS Utilizados

| Servicio | Propósito |
|----------|-----------|
| **VPC** | Red privada aislada |
| **EC2/ECS** | Compute para aplicaciones |
| **RDS/DocumentDB** | Base de datos MongoDB-compatible |
| **S3** | Almacenamiento de assets |
| **CloudFront** | CDN para contenido estático |
| **ALB** | Load balancer para tráfico HTTP |
| **IAM** | Gestión de permisos y roles |
| **CloudWatch** | Monitoreo y logs |
| **Secrets Manager** | Gestión de secretos |

---

## 🔄 Flujo de Trabajo

### Desde Trello a PR

1. **Card en "Ready for Development"** en Trello
2. **Label** `Voltom-Tech/plazalud-infra` asignado
3. **Auto-PR script** detecta la card
4. **Verifica score** en analyze-tasks.js
5. **Genera branch** y **PR automático**
6. **Review** del equipo
7. **Merge** y **deploy** automático

### Comandos del Auto-PR

```bash
# Cargar variables de entorno
source ~/.openclaw/env

# Ejecutar auto-pr (desde task-tracker)
cd /home/admin/.openclaw/workspace/task-tracker
node scripts/auto-pr.js
```

---

## 🔐 Seguridad

### Mejores Prácticas

- ✅ **Secrets** en AWS Secrets Manager (no en código)
- ✅ **IAM Roles** con mínimo privilegio necesario
- ✅ **VPC Flow Logs** para auditoría de red
- ✅ **Encryption** en tránsito (TLS) y en reposo (AES-256)
- ✅ **Security Groups** restrictivos por defecto
- ✅ **MFA** requerido para acceso a producción

### Variables Sensibles

```bash
# Nunca commitear estos archivos
.env
*.tfstate
*.tfstate.backup
secrets/
```

---

## 📊 Monitoreo

### Dashboards

- **CloudWatch Dashboard**: Métricas de infraestructura
- **X-Ray**: Tracing de requests
- **Application Logs**: Centralizados en CloudWatch Logs

### Alertas

- CPU > 80% por 5 minutos
- Memory > 85% por 5 minutos
- Error rate > 1% en 5 minutos
- Latencia p95 > 500ms

---

## 🧪 Testing

### Terraform

```bash
# Validar configuración
terraform validate

# Formatear archivos
terraform fmt -recursive

# Planear sin aplicar
terraform plan

# Testear con tflint
tflint
```

### Infraestructura

```bash
# Kitchen-Terraform para testing
kitchen create
kitchen converge
kitchen verify
kitchen destroy
```

---

## 📝 Convenciones

### Naming

```
{project}-{environment}-{resource}-{number}
Ej: plazalud-dev-vpc-01
    plazalud-prod-ecs-api-01
```

### Tags

Todos los recursos deben tener:

```hcl
tags = {
  Project     = "PlazaLud"
  Environment = "dev" # staging, production
  ManagedBy   = "terraform"
  Owner       = "voltom-tech"
}
```

### Branches

```
main          # Producción
staging       # Pre-producción
feature/*     # Nuevas features
hotfix/*      # Fixes urgentes
```

---

## 🤝 Contribución

### Pull Requests

1. Fork el repositorio
2. Crea branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Abre PR

### Code Review

- ✅ Terraform validado y formateado
- ✅ Plan revisado (sin cambios inesperados)
- ✅ Tags agregados a todos los recursos
- ✅ Documentación actualizada

---

## 📚 Recursos

- [Terraform Docs](https://www.terraform.io/docs)
- [AWS Terraform Provider](https://registry.terraform.io/providers/hashicorp/aws)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

---

## 📞 Soporte

- **Issues**: [GitHub Issues](https://github.com/Voltom-Tech/plazalud-infra/issues)
- **Trello**: [Development Board](https://trello.com/b/STrhmjpz/development-board)
- **Email**: cesar.zegarram@gmail.com

---

## 📄 Licencia

Propietario - Voltom-Tech © 2026

---

_Infraestructura construida con ❤️ usando Terraform_
