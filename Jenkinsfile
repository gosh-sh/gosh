pipeline {
	agent {
        dockerfile {
            filename 'Dockerfile'
            dir '.'
            args '-v /var/run/docker.sock:/var/run/docker.sock --group-add docker'
        }
        
    }

    stages {
        stage('Clone repository') {
            steps {
            checkout scm
            }

        }   

        stage('Build') { 
            parallel {
                stage("SMV") {
                    steps {
                        script {
                            dir ('contracts/smv') {
                                sh 'make build-contracts'
                            }
                        }
                    }
                }
                stage("GOSH") {
                    steps {
                        script {
                            dir ('contracts/gosh') {
                                sh 'make build-contracts'
                            }
                        }
                    }
                }
                stage("Git Helper") {
                    steps {
                        script {
                            dir ('git-remote-gosh') {
                                sh 'make build'
                            }
                        }
                    }
                }
                stage("Docker Extension") {
                    steps {
                        script {
                            dir ('docker-extension') {
                                sh 'make build'
                            }
                        }
                    }
                }
            }
        }

        stage('Unit tests') { 
            parallel {
                stage("SMV") {
                    steps {
                        script {
                            dir ('contracts/smv') {
                                sh 'echo placeholder_1'
                            }
                        }
                    }
                }
                stage("GOSH") {
                    steps {
                        script {
                            dir ('contracts/gosh') {
                                sh 'echo placeholder_2'
                            }
                        }
                    }
                }
                stage("Git Helper") {
                    steps {
                        script {
                            dir ('git-remote-gosh') {
                                sh 'echo placeholder_3'
                            }
                        }
                    }
                }
                stage("Docker Extension") {
                    steps {
                        script {
                            dir ('docker-extension') {
                                sh 'echo placeholder_4'
                            }
                        }
                    }
                }
            }
        }

        stage('Integration Tests setup') { 
            stages {
                stage("Deploy smart-contracts") {
                    steps {
                        script {
                            dir ('contracts/gosh') {
                                sh 'deploy-docker'
                            }
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