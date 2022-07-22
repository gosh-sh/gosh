pipeline {
	agent {
        dockerfile {
            filename 'Dockerfile'
            dir '.'
        }
        
    }

    stages {
        stage('Clone repository') {
            steps {
            checkout scm
            }

        }   

        stage('SMV') { 
            stages {
                stage("Build") {
                    steps {
                        script {
                            dir ('contracts/smv') {
                                sh 'make build-contracts'
                            }
                        }
                    }
                }
                /*stage("Test") {
                    steps {
                        script {
                            dir ('contracts/smv') {
                                sh 'make build-contracts'
                            }
                        }
                    }
                }*/
            }
        }

        stage('GOSH') { 
            stages {
                stage("Build") {
                    steps {
                        script {
                            dir ('contracts/gosh') {
                                sh 'make build-contracts'
                            }
                        }
                    }
                }
                /*stage("Test") {
                    steps {
                        script {
                            dir ('contracts/gosh') {
                                sh 'make build-contracts'
                            }
                        }
                    }
                }*/
            }
        }

        stage('Git Helper') { 
            stages {
                stage("Build") {
                    steps {
                        script {
                            sh 'cd git-remote-gosh && make build'
                        }
                    }
                }
                /*stage("Test") {
                    steps {
                        script {
                            sh ''
                        }
                    }
                }*/
            }
        }

        stage('Docker Extension') { 
            stages {
                stage("Build") {
                    steps {
                        script {
                            sh 'echo "NEED REPO"'
                        }
                    }
                }
                /*stage("Test") {
                    steps {
                        script {
                            sh ''
                        }
                    }
                }*/
            }
        }

        stage('Test environment setup') { 
            stages {
                stage("Deploy smart-contracts") {
                    steps {
                        script {
                            sh 'cd contracts/gosh && deploy-docker'
                        }
                    }
                }
                /*stage("Functional testing") {
                    steps {
                        script {
                            sh ''
                        }
                    }
                }*/
            }
        }

    }
}