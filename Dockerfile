# Use Maven + JDK 21 to build the app
FROM maven:3.9.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Copy everything
COPY . .

# Build the project
RUN mvn clean package -DskipTests


# Use lightweight JDK image to run
FROM eclipse-temurin:21-jdk-jammy

WORKDIR /app

# Copy jar from builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose port
EXPOSE 8080

# Run the app
ENTRYPOINT ["java", "-jar", "app.jar"]