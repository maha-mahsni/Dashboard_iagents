pipeline {

    agent any

    environment {
        COMPOSE_PROJECT_NAME = 'dashboard_iagents'
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Récupération du code source...'
                checkout scm
            }
        }

        stage('Verify Files') {
            steps {
                echo 'Vérification des fichiers du projet...'

                sh '''
                    echo "Répertoire courant :"
                    pwd

                    echo "Contenu du projet :"
                    ls -la

                    echo "Vérification Docker Compose :"
                    test -f docker-compose.yml

                    echo "Vérification Dockerfile frontend :"
                    test -f Dockerfile

                    echo "Vérification Dockerfile backend :"
                    test -f package/Dockerfile.backend

                    echo "Vérification Prisma :"
                    test -f prisma/schema.prisma

                    echo "Vérification Jenkinsfile :"
                    test -f Jenkinsfile

                    echo "Tous les fichiers nécessaires sont présents."
                '''
            }
        }

        stage('Docker Build') {
            steps {
                echo 'Construction des images Docker...'

                sh '''
                    docker compose build
                '''
            }
        }

        stage('Stop Previous Deployment') {
            steps {
                echo 'Arrêt de l''ancienne version...'

                sh '''
                    docker compose down --remove-orphans || true
                '''
            }
        }

        stage('Deploy') {
            steps {
                echo 'Déploiement de l''application...'

                sh '''
                    docker compose up -d
                '''
            }
        }

        stage('Wait for MySQL') {
            steps {
                echo 'Attente du démarrage de MySQL...'

                sh '''
                    echo "Attente de MySQL..."

                    for i in $(seq 1 30); do

                        STATUS=$(docker compose ps mysql --format "{{.Status}}" 2>/dev/null || true)

                        echo "État MySQL : $STATUS"

                        if echo "$STATUS" | grep -q "healthy"; then
                            echo "MySQL est prêt."
                            break
                        fi

                        if [ "$i" -eq 30 ]; then
                            echo "MySQL n'est pas prêt après 30 tentatives."
                            docker compose logs mysql
                            exit 1
                        fi

                        sleep 2
                    done
                '''
            }
        }

        stage('Check Services') {
            steps {
                echo 'Vérification des services...'

                sh '''
                    echo "État des conteneurs :"
                    docker compose ps

                    echo ""
                    echo "Vérification MySQL..."
                    docker compose ps mysql | grep -q "healthy"

                    echo ""
                    echo "Vérification Backend FastAPI..."
                    curl -f http://localhost:8000/docs

                    echo ""
                    echo "Vérification Frontend Next.js..."
                    curl -f http://localhost:3000

                    echo ""
                    echo "Tous les services sont opérationnels."
                '''
            }
        }

    }

    post {

        success {
            echo '''
            ==========================================
            DÉPLOIEMENT RÉUSSI
            ==========================================

            Frontend : http://localhost:3000
            FastAPI  : http://localhost:8000
            Swagger  : http://localhost:8000/docs
            MySQL    : localhost:3306

            Tous les services sont opérationnels.
            ==========================================
            '''
        }

        failure {
            echo '''
            ==========================================
            ÉCHEC DU DÉPLOIEMENT
            ==========================================
            '''

            sh '''
                echo "État des conteneurs :"
                docker compose ps || true

                echo ""
                echo "Logs Backend :"
                docker compose logs --tail=50 backend || true

                echo ""
                echo "Logs Frontend :"
                docker compose logs --tail=50 frontend || true

                echo ""
                echo "Logs MySQL :"
                docker compose logs --tail=50 mysql || true
            '''
        }

        always {
            echo 'Fin du pipeline Jenkins.'
        }
    }
}
