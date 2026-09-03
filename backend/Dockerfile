# Build stage — pom.xml copied and dependencies resolved before the source
# copy so `docker build` only re-downloads deps when pom.xml itself changes,
# not on every source edit.
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q package -DskipTests

# Runtime stage — JRE only (no compiler/Maven), non-root, just the jar.
# jammy (not -alpine): eclipse-temurin's alpine JRE tag for 17 has no arm64
# manifest, which breaks the build on Apple Silicon; jammy is multi-arch.
FROM eclipse-temurin:17-jre-jammy
RUN groupadd -r smepos && useradd -r -g smepos smepos
WORKDIR /app
COPY --from=build /app/target/app.jar app.jar
USER smepos
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
