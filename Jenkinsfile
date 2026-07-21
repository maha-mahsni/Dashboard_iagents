pipeline {

    agent any

    stages {

        stage('Checkout') {
            steps {
                echo 'Récupération du code source...'
                checkout scm
            }
        }

        stage('Docker Build') {
            steps {
                echo 'Construction des images Docker...'
                sh 'docker compose -f docker-compose.yml build'
            }
        }

        stage('Stop Old Version') {
            steps {
                echo "Arrêt de l'ancienne version..."
                sh 'docker compose -f docker-compose.yml down || true'
            }
        }

        stage('Deploy') {
            steps {
                echo "Déploiement de l'application..."
                sh 'docker compose -f docker-compose.yml up -d'
            }
        }

        stage('Check Services') {
            steps {
                echo 'Vérification des services...'
                sh 'docker compose -f docker-compose.yml ps'
            }
        }

        stage('Health Check') {
            steps {
                echo 'Vérification de la disponibilité des services...'

                sh '''
                    sleep 10

                    echo "Test Frontend..."
                    curl -f http://localhost:3000 || exit 1

                    echo "Test Backend..."
                    curl -f http://localhost:8000/docs || exit 1

                    echo "Tous les services sont disponibles."
                '''
            }
        }
    }

    post {

        success {
            echo 'Déploiement terminé avec succès !'
        }

        failure {
            echo 'Le pipeline a échoué.'
        }

        always {
            echo 'Fin du pipeline CI/CD.'
        }
    }
}
