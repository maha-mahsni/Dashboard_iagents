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
                echo 'Vérification des fichiers du projet...'
                sh '''
                    pwd
                    ls -la
                    test -f docker-compose.yml
                    test -f Dockerfile
                    test -f Jenkinsfile
                '''
            }
        }

        stage('Docker Build') {
            steps {
                echo 'Construction des images Docker...'
                sh '''
                    docker compose -f docker-compose.yml build
                '''
            }
        }

        stage('Deploy') {
            steps {
                echo 'Déploiement de l'application...'
                sh '''
                    docker compose -f docker-compose.yml up -d
                '''
            }
        }

        stage('Check Services') {
            steps {
                echo 'Vérification des services...'
                sh '''
                    docker compose -f docker-compose.yml ps
                '''
            }
        }
    }

    post {
        success {
            echo 'Pipeline CI/CD terminé avec succès !'
        }
        failure {
            echo 'Le pipeline a échoué.'
        }
    }
}
