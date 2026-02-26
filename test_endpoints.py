#!/usr/bin/env python3
"""
Script de validação dos endpoints dos apps MVP.
Testa os principais endpoints de LiciAI e Clínia.
"""

import requests
import json
import sys
from typing import Dict, Any

# Configuração
LICIAI_BASE_URL = "https://us-east1-sharp-footing-475513-c7.cloudfunctions.net/api"
CLINIA_BASE_URL = "https://clinia.web.app/api"  # Via hosting rewrites
CLINIA_HOSTING_URL = "https://clinia.web.app"

# Nota: Para testar endpoints autenticados, precisaríamos de um token Firebase válido
# Este script testa apenas endpoints públicos

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'=' * 60}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}{text.center(60)}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'=' * 60}{Colors.END}\n")

def print_success(text: str):
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_error(text: str):
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_warning(text: str):
    print(f"{Colors.YELLOW}⚠ {text}{Colors.END}")

def print_info(text: str):
    print(f"{Colors.BLUE}ℹ {text}{Colors.END}")

def test_endpoint(name: str, url: str, method: str = "GET", headers: Dict = None, data: Dict = None) -> bool:
    """Testa um endpoint e retorna True se bem-sucedido."""
    print(f"\n{Colors.BOLD}Testando:{Colors.END} {name}")
    print(f"  URL: {url}")
    print(f"  Método: {method}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=10)
        else:
            print_error(f"Método {method} não suportado")
            return False
        
        print(f"  Status: {response.status_code}")
        
        if response.status_code < 400:
            print_success(f"Sucesso! Status {response.status_code}")
            try:
                json_data = response.json()
                print(f"  Resposta: {json.dumps(json_data, indent=2)[:200]}...")
            except:
                print(f"  Resposta (text): {response.text[:200]}")
            return True
        else:
            print_error(f"Falha com status {response.status_code}")
            print(f"  Erro: {response.text[:200]}")
            return False
            
    except requests.exceptions.Timeout:
        print_error("Timeout - Servidor não respondeu em 10s")
        return False
    except requests.exceptions.ConnectionError:
        print_error("Erro de conexão - Servidor pode estar offline")
        return False
    except Exception as e:
        print_error(f"Erro inesperado: {str(e)}")
        return False

def test_liciai():
    """Testa endpoints públicos do LiciAI."""
    print_header("TESTES DO LICIAI")
    
    results = []
    
    print_info("LiciAI ainda não foi deployado. Esperado: 404 ou timeout")
    print_info("Para deploy: cd liciai && firebase deploy --only functions,hosting")
    
    # Teste 1: Verificar se Functions existem
    try:
        response = requests.get(f"{LICIAI_BASE_URL}/getOportunidades?limit=5", timeout=5)
        if response.status_code == 200:
            print_success("API está online e respondendo!")
            results.append(True)
        elif response.status_code == 404:
            print_warning("API ainda não deployada (404)")
            results.append(False)
        else:
            print_info(f"Status: {response.status_code}")
            results.append(False)
    except Exception as e:
        print_warning(f"API offline ou não deployada: {str(e)[:100]}")
        results.append(False)
    
    return results

def test_clinia():
    """Testa endpoints do Clínia."""
    print_header("TESTES DO CLÍNIA")
    
    results = []
    
    # Teste 1: Página principal (index.html)
    results.append(test_endpoint(
        "GET / (index.html)",
        CLINIA_HOSTING_URL,
        "GET"
    ))
    
    # Teste 2: API base (se existir endpoint público)
    # Nota: Clínia pode não ter endpoints públicos na API
    print_info("Clínia usa autenticação Firebase - endpoints da API requerem token")
    
    return results

def test_hub_local():
    """Testa endpoints do hub localmente."""
    print_header("TESTES DO HUB (LOCAL)")
    
    HUB_BASE = "http://localhost:8080"
    results = []
    
    # Teste 1: Config endpoint (público)
    results.append(test_endpoint(
        "GET /hub/api/config",
        f"{HUB_BASE}/hub/api/config",
        "GET"
    ))
    
    # Teste 2: Apps endpoint sem auth (deve falhar)
    print_info("Testando endpoint autenticado sem token (esperado: 401)")
    try:
        response = requests.get(f"{HUB_BASE}/hub/api/apps", timeout=5)
        if response.status_code == 401:
            print_success("Corretamente protegido! Status 401")
            results.append(True)
        else:
            print_warning(f"Esperava 401, recebeu {response.status_code}")
            results.append(False)
    except requests.exceptions.ConnectionError:
        print_error("⚠️ Hub não está rodando em localhost:8080")
        print_info("Para testar o hub localmente, execute: gunicorn --bind 0.0.0.0:8080 main:app")
        results.append(False)
    except Exception as e:
        print_error(f"Erro: {str(e)}")
        results.append(False)
    
    return results

def main():
    """Executa todos os testes."""
    print(f"\n{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{'VALIDAÇÃO DE ENDPOINTS DOS APPS MVP'.center(60)}{Colors.END}")
    print(f"{Colors.BOLD}{'='*60}{Colors.END}")
    
    all_results = []
    
    # Testes LiciAI
    try:
        all_results.extend(test_liciai())
    except Exception as e:
        print_error(f"Erro nos testes do LiciAI: {e}")
    
    # Testes Clínia
    try:
        all_results.extend(test_clinia())
    except Exception as e:
        print_error(f"Erro nos testes do Clínia: {e}")
    
    # Testes Hub Local
    try:
        all_results.extend(test_hub_local())
    except Exception as e:
        print_error(f"Erro nos testes do Hub: {e}")
    
    # Resumo
    print_header("RESUMO DOS TESTES")
    total = len(all_results)
    passed = sum(all_results)
    failed = total - passed
    
    print(f"\n  Total de testes: {total}")
    print_success(f"  Passou: {passed}")
    if failed > 0:
        print_error(f"  Falhou: {failed}")
    
    percentage = (passed / total * 100) if total > 0 else 0
    print(f"\n  Taxa de sucesso: {percentage:.1f}%\n")
    
    if percentage == 100:
        print_success("🎉 Todos os testes passaram!")
        return 0
    elif percentage >= 70:
        print_warning("⚠️ Alguns testes falharam, mas a maioria passou")
        return 1
    else:
        print_error("❌ Muitos testes falharam")
        return 2

if __name__ == "__main__":
    sys.exit(main())
