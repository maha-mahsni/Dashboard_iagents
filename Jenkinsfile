pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                echo 'Récupération du code source...'
                checkout scm
            }
        }

        stage('Verify Files') {
            steps {
                sh '''
                    echo "Répertoire courant :"
                    pwd

                    echo "Contenu du workspace :"
                    ls -la

                    echo "Recherche docker-compose :"
                    find . -maxdepth 3 -name "docker-compose.yml" -o -name "compose.yml"
                '''
            }
        }

        stage('Docker Build') {
            steps {
                echo 'Construction des images Docker...'
                sh 'docker compose build'
            }
        }

        stage('Deploy') {
            steps {
                echo "Déploiement de l'application..."
                sh 'docker compose up -d'
            }
        }

        stage('Check Services') {
            steps {
                echo 'Vérification des services...'
                sh 'docker compose ps'
            }
        }
    }
}
