pipeline {
	agent {
        docker {
            image 'jenkins-docker-agent:1'
            args '-v /var/run/docker.sock:/var/run/docker.sock -v /tmp/giver.keys.json:/tmp/giver.keys.json --group-add docker'
        }  
    }

    stages {
        stage('Clone repository') {
            steps {
            checkout scm
            }

        }   

        stage('Build') { 
            failFast true
            stages {
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
                stage("Git Helper: Linux") {
                    steps {
                        script {
                            dir ('git-remote-gosh') {
                                sh "make build target-dir='build-${BUILD_NUMBER}' TARGET_ARCH=x86_64-unknown-linux-gnu"
                                archiveArtifacts artifacts: "build-${BUILD_NUMBER}/git-remote-gosh-x86_64-unknown-linux-gnu"
                            }
                        }
                    }
                }
                stage("Git Helper: Windows") {
                    steps {
                        script {
                            dir ('git-remote-gosh') {
                                sh "make build target-dir='build-${BUILD_NUMBER}' TARGET_ARCH=x86_64-pc-windows-gnu"
                                archiveArtifacts artifacts: "build-${BUILD_NUMBER}/git-remote-gosh-x86_64-pc-windows-gnu"
                            }
                        }
                    }
                }
                stage("Docker Extension") {
                    steps {
                        script {
                            dir ('docker-extension') {
                                sh "mkdir -p ./.tmp/git-remote-gosh && cp -r ../git-remote-gosh/target/x86_64-unknown-linux-gnu/release/* ./.tmp/git-remote-gosh && make build-ci"
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
                                sh 'make prepare-docker && make deploy-docker KEYS_PATH=/tmp/giver.keys.json NETWORK=vps23.ton.dev GIVER_WALLET_ADDR=0:c6f86566776529edc1fcf3bc444c2deb9f3e077f35e49871eb4d775dd0b04391'
                                archiveArtifacts artifacts: "gosh.seed"
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
    post { 
        always { 
            cleanWs()
        }
    }
}