# Usa la imagen oficial de Nginx basada en Alpine (ligera y óptima para producción)
FROM nginx:alpine

# Copia los archivos estáticos del proyecto al directorio público de Nginx
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/

# Expone el puerto 80
EXPOSE 80

# Inicia Nginx
CMD ["nginx", "-g", "daemon off;"]
