# Docker 部署指南

本文档介绍如何使用 Docker 部署企业法务合规管理平台。

## 前置要求

- Docker (版本 20.10+)
- Docker Compose (版本 2.0+)

## 快速开始

### 1. 构建并启动服务

```bash
# 使用 Docker Compose 构建并启动
docker compose up -d --build

# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 2. 访问应用

- 应用地址: http://localhost:3000
- API 文档: http://localhost:3000/api

### 3. 默认账号

- 管理员: admin / admin123
- 普通用户: zhangsan / manager123

## 常用命令

### 启动服务

```bash
# 后台启动
docker-compose up -d

# 前台启动（查看日志）
docker-compose up
```

### 停止服务

```bash
# 停止服务
docker-compose stop

# 停止并删除容器
docker-compose down

# 停止并删除容器及数据卷
docker-compose down -v
```

### 重新构建

```bash
# 重新构建镜像
docker-compose build --no-cache

# 重新构建并启动
docker-compose up -d --build
```

### 查看日志

```bash
# 查看所有日志
docker-compose logs

# 实时查看日志
docker-compose logs -f

# 查看特定服务的日志
docker-compose logs legal-compliance-system
```

### 进入容器

```bash
# 进入容器 shell
docker-compose exec legal-compliance-system sh

# 或者使用 docker exec
docker exec -it legal-compliance-system sh
```

## 数据持久化

Docker Compose 配置了以下数据卷：

- `./database:/app/database` - 数据库文件
- `./uploads:/app/uploads` - 上传文件

这些目录会自动创建并持久化数据。

## 环境变量

可以在 `docker-compose.yml` 中修改以下环境变量：

```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
```

## 自定义配置

### 修改端口

编辑 `docker-compose.yml`：

```yaml
ports:
  - "8080:3000"  # 将主机的 8080 端口映射到容器的 3000 端口
```

### 添加环境变量

编辑 `docker-compose.yml`：

```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
  - DB_PATH=/app/database/legal_compliance.db
  - JWT_SECRET=your-secret-key
```

## 生产环境部署

### 使用环境变量文件

创建 `.env` 文件：

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key
DB_PATH=/app/database/legal_compliance.db
```

修改 `docker-compose.yml`：

```yaml
services:
  legal-compliance-system:
    env_file:
      - .env
```

### 使用 Nginx 反向代理

创建 `nginx.conf`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 使用 HTTPS

建议使用 Let's Encrypt 或其他 SSL 证书服务。

## 故障排除

### 端口被占用

```bash
# 查看端口占用
lsof -i :3000

# 修改端口
# 编辑 docker-compose.yml，修改 ports 配置
```

### 数据库权限问题

```bash
# 检查数据库目录权限
ls -la database/

# 修复权限
chmod -R 755 database/
```

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs legal-compliance-system

# 检查容器状态
docker-compose ps
```

### 重新初始化数据库

```bash
# 删除现有数据库
rm -rf database/*.db

# 重启服务
docker-compose restart
```

## 备份与恢复

### 备份数据

```bash
# 备份数据库
cp -r database/ backup/database_$(date +%Y%m%d)/

# 备份上传文件
cp -r uploads/ backup/uploads_$(date +%Y%m%d)/

# 或者使用 tar
tar -czf backup_$(date +%Y%m%d).tar.gz database/ uploads/
```

### 恢复数据

```bash
# 恢复数据库
cp -r backup/database_YYYYMMDD/* database/

# 恢复上传文件
cp -r backup/uploads_YYYYMMDD/* uploads/

# 重启服务
docker-compose restart
```

## 监控与维护

### 查看资源使用情况

```bash
# 查看容器资源使用
docker stats

# 查看特定容器
docker stats legal-compliance-system
```

### 清理资源

```bash
# 清理未使用的容器、网络、镜像
docker system prune

# 清理所有未使用的资源（包括数据卷）
docker system prune -a --volumes
```

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build

# 查看更新日志
docker-compose logs -f
```

## 技术支持

如有问题，请查看日志：

```bash
docker-compose logs -f
```

或提交 Issue 到项目仓库。
