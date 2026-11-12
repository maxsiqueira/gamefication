import { Pod, Node, Deployment } from '../types/kubernetes';

export interface CommandResult {
  output: string;
  isError?: boolean;
  affectedDeployments?: { name: string; replicas?: number; cpuLimit?: number; memLimit?: number; cpuReq?: number; memReq?: number; hpa?: boolean }[];
  affectedPods?: { id: string; action: 'delete' | 'restart' | 'patch' }[];
  affectedNodes?: { id: string; action: 'drain' | 'uncordon' }[];
}

export function executeKubectlCommand(
  cmdInput: string,
  state: {
    pods: Pod[];
    nodes: Node[];
    deployments: Deployment[];
  }
): CommandResult {
  const trimmed = cmdInput.trim();
  if (!trimmed) {
    return { output: '' };
  }

  const parts = trimmed.split(/\s+/);
  const base = parts[0].toLowerCase();

  if (base === 'clear') {
    return { output: '__CLEAR__' };
  }

  if (base === 'help') {
    return {
      output: `KubeCommander kubectl Interactive CLI Cheat Sheet:
  
  DISCOVERY:
    kubectl get nodes               # List all cluster nodes & ready status
    kubectl get pods -A             # List all pods across all namespaces
    kubectl get deploy              # List deployments and replica status
    kubectl get svc                 # List cluster services & endpoints
    kubectl top nodes               # Real-time node CPU & memory metrics
    kubectl top pods                # Real-time pod resource utilization
    kubectl get events              # View recent cluster events & scheduling
  
  INSPECTION:
    kubectl describe pod <name>     # Inspect container specs, probes & events
    kubectl describe node <name>    # Inspect node capacity, pressure & allocatable
    kubectl logs <name>             # Stream stdout/stderr container logs
  
  REMEDIATION & SCALING:
    kubectl scale deploy <name> --replicas=<num>    # Scale deployment replicas
    kubectl autoscale deploy <name> --min=2 --max=8 --cpu-percent=70 # Enable HPA
    kubectl rollout restart deploy <name>           # Trigger zero-downtime update
    kubectl delete pod <name>                       # Terminate malfunctioning pod
    kubectl drain node <name>                       # Evict pods & cordon node
    kubectl uncordon node <name>                    # Restore node to scheduler
    kubectl set resources deploy <name> --limits=cpu=500m,memory=1024Mi`,
    };
  }

  if (base !== 'kubectl') {
    return {
      output: `command not found: ${base}. Type 'help' or 'kubectl --help' for commands.`,
      isError: true,
    };
  }

  const verb = parts[1]?.toLowerCase();

  // kubectl get ...
  if (verb === 'get') {
    const resource = parts[2]?.toLowerCase();
    const isAllNamespaces = parts.includes('-A') || parts.includes('--all-namespaces');
    const isWide = parts.includes('-o') && parts.includes('wide');

    if (!resource || resource === '--help') {
      return {
        output: `You must specify the type of resource to get. Valid types include:
  * pods (po)
  * nodes (no)
  * deployments (deploy)
  * services (svc)
  * events`,
      };
    }

    if (resource === 'pods' || resource === 'po' || resource === 'pod') {
      let filtered = state.pods;
      const nsIndex = parts.indexOf('-n');
      if (nsIndex !== -1 && parts[nsIndex + 1]) {
        const ns = parts[nsIndex + 1];
        filtered = filtered.filter(p => p.namespace === ns);
      } else if (!isAllNamespaces) {
        filtered = filtered.filter(p => p.namespace === 'production');
      }

      if (filtered.length === 0) {
        return { output: 'No resources found in namespace.' };
      }

      let header = isAllNamespaces
        ? 'NAMESPACE      NAME                               READY   STATUS             RESTARTS   AGE'
        : 'NAME                               READY   STATUS             RESTARTS   AGE';
      if (isWide) {
        header += '   IP            NODE';
      }

      const rows = filtered.map(p => {
        const readyStr = p.status === 'Running' ? '1/1' : '0/1';
        const ageStr = `${Math.floor(p.ageSeconds / 60)}m`;
        const namePad = p.name.padEnd(34);
        const readyPad = readyStr.padEnd(7);
        const statusPad = p.status.padEnd(18);
        const restartPad = String(p.restarts).padEnd(10);

        if (isAllNamespaces) {
          const nsPad = p.namespace.padEnd(14);
          let row = `${nsPad} ${namePad} ${readyPad} ${statusPad} ${restartPad} ${ageStr}`;
          if (isWide) {
            row += `   ${p.ip.padEnd(13)} ${p.nodeId}`;
          }
          return row;
        } else {
          let row = `${namePad} ${readyPad} ${statusPad} ${restartPad} ${ageStr}`;
          if (isWide) {
            row += `   ${p.ip.padEnd(13)} ${p.nodeId}`;
          }
          return row;
        }
      });

      return { output: [header, ...rows].join('\n') };
    }

    if (resource === 'nodes' || resource === 'no' || resource === 'node') {
      const header = 'NAME                    STATUS                     ROLES           AGE   VERSION';
      const rows = state.nodes.map(n => {
        let statusStr = n.status;
        if (n.cordoned) statusStr += ',SchedulingDisabled';
        const namePad = n.name.padEnd(23);
        const statusPad = statusStr.padEnd(26);
        const rolePad = n.role.padEnd(15);
        return `${namePad} ${statusPad} ${rolePad} 14d   v1.31.2`;
      });
      return { output: [header, ...rows].join('\n') };
    }

    if (resource === 'deploy' || resource === 'deployments' || resource === 'deployment') {
      const header = 'NAME                 READY   UP-TO-DATE   AVAILABLE   AGE   CONTAINERS        IMAGES';
      const rows = state.deployments.map(d => {
        const readyStr = `${d.availableReplicas}/${d.replicas}`;
        return `${d.name.padEnd(20)} ${readyStr.padEnd(7)} ${String(d.replicas).padEnd(12)} ${String(d.availableReplicas).padEnd(11)} 5d    ${d.name.padEnd(17)} ${d.image}`;
      });
      return { output: [header, ...rows].join('\n') };
    }

    if (resource === 'svc' || resource === 'services' || resource === 'service') {
      return {
        output: `NAME                 TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
kubernetes           ClusterIP   10.96.0.1        <none>        443/TCP          14d
frontend-edge        LoadBalancer 10.96.14.88     35.202.12.9   80:31284/TCP     5d
payment-gateway      ClusterIP   10.96.42.102     <none>        8080/TCP         5d
cart-redis           ClusterIP   10.96.88.19      <none>        6379/TCP         5d
analytics-worker     ClusterIP   10.96.99.44      <none>        9090/TCP         5d`,
      };
    }

    if (resource === 'events') {
      const recentPods = state.pods.slice(0, 5);
      const rows = recentPods.map(p => {
        return `Normal   Scheduled   ${Math.floor(p.ageSeconds / 60)}m   default-scheduler   Successfully assigned default/${p.name} to ${p.nodeId}
Normal   Pulled      ${Math.floor(p.ageSeconds / 60)}m   kubelet             Container image "docker.io/app" already present on machine
Normal   Created     ${Math.floor(p.ageSeconds / 60)}m   kubelet             Created container ${p.deploymentName}
Normal   Started     ${Math.floor(p.ageSeconds / 60)}m   kubelet             Started container ${p.deploymentName}`;
      });
      return { output: rows.join('\n') };
    }

    return { output: `error: the server doesn't have a resource type "${resource}"`, isError: true };
  }

  // kubectl top ...
  if (verb === 'top') {
    const sub = parts[2]?.toLowerCase();
    if (sub === 'nodes' || sub === 'node') {
      const header = 'NAME                    CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%';
      const rows = state.nodes.map(n => {
        const cpuPercent = Math.round((n.cpuUsage / n.cpuCores) * 100);
        const memPercent = Math.round((n.memUsage / n.memoryMb) * 100);
        return `${n.name.padEnd(23)} ${String(n.cpuUsage + 'm').padEnd(12)} ${String(cpuPercent + '%').padEnd(6)} ${String(n.memUsage + 'Mi').padEnd(15)} ${memPercent}%`;
      });
      return { output: [header, ...rows].join('\n') };
    }

    if (sub === 'pods' || sub === 'pod') {
      const header = 'NAME                               CPU(cores)   MEMORY(bytes)';
      const rows = state.pods.map(p => {
        return `${p.name.padEnd(34)} ${String(p.cpuUsage + 'm').padEnd(12)} ${p.memUsage}Mi`;
      });
      return { output: [header, ...rows].join('\n') };
    }

    return { output: 'error: unknown top target. Valid targets: nodes, pods', isError: true };
  }

  // kubectl describe ...
  if (verb === 'describe') {
    const resource = parts[2]?.toLowerCase();
    const name = parts[3];

    if (!name) {
      return { output: 'error: resource name required. e.g. kubectl describe pod <name>', isError: true };
    }

    if (resource === 'pod' || resource === 'po') {
      const pod = state.pods.find(p => p.name.includes(name) || p.id === name);
      if (!pod) {
        return { output: `error: pods "${name}" not found`, isError: true };
      }
      return {
        output: `Name:         ${pod.name}
Namespace:    ${pod.namespace}
Priority:     0
Node:         ${pod.nodeId}/${pod.ip}
Start Time:   ${new Date(Date.now() - pod.ageSeconds * 1000).toUTCString()}
Labels:       app=${pod.deploymentName}
Status:       ${pod.status}
IP:           ${pod.ip}
QoS Class:    ${pod.qosClass}
Containers:
  ${pod.deploymentName}:
    Container ID:   containerd://9f8a7e${pod.id}
    Image:          docker.io/k8s/${pod.deploymentName}:latest
    Port:           ${pod.ports.join(', ')}/TCP
    State:          ${pod.status === 'Running' ? 'Running' : `Waiting (CrashLoopBackOff / exit code ${pod.status === 'OOMKilled' ? '137' : '1'})`}
    Ready:          ${pod.status === 'Running' ? 'True' : 'False'}
    Restart Count:  ${pod.restarts}
    Limits:
      cpu:     ${pod.cpuLimit}m
      memory:  ${pod.memLimit}Mi
    Requests:
      cpu:     ${pod.cpuRequest}m
      memory:  ${pod.memRequest}Mi
    Liveness:     http-get http://:${pod.livenessProbe.port}${pod.livenessProbe.path} delay=5s timeout=2s period=${pod.livenessProbe.periodSeconds}s
Events:
  Type     Reason     Age                From               Message
  ----     ------     ----               ----               -------
  Normal   Scheduled  ${Math.floor(pod.ageSeconds / 60)}m                default-scheduler  Successfully assigned to ${pod.nodeId}
  Normal   Pulled     ${Math.floor(pod.ageSeconds / 60)}m                kubelet            Container image pulled
  ${pod.status === 'OOMKilled' ? 'Warning  OOMKilling 20s                kernel             Process terminated: memory limit exceeded' : 'Normal   Started    5m                 kubelet            Started container'}`,
      };
    }

    if (resource === 'node' || resource === 'no') {
      const node = state.nodes.find(n => n.name.includes(name) || n.id === name);
      if (!node) {
        return { output: `error: nodes "${name}" not found`, isError: true };
      }
      return {
        output: `Name:               ${node.name}
Roles:              ${node.role}
Labels:             topology.kubernetes.io/zone=${node.zone}
                    node.kubernetes.io/instance-type=e2-standard-4
CreationTimestamp:  14d ago
Status:             ${node.status}
Addresses:          InternalIP: 10.128.0.24, Hostname: ${node.name}
Capacity:
  cpu:     4
  memory:  8192Mi
Allocatable:
  cpu:     3800m
  memory:  7600Mi
Non-terminated Pods: (${state.pods.filter(p => p.nodeId === node.id).length} pods)`,
      };
    }

    return { output: `describe for "${resource}" not implemented. Use 'describe pod' or 'describe node'.`, isError: true };
  }

  // kubectl logs ...
  if (verb === 'logs') {
    const name = parts[2];
    if (!name) {
      return { output: 'error: pod name required. e.g. kubectl logs <pod_name>', isError: true };
    }
    const pod = state.pods.find(p => p.name.includes(name) || p.id === name);
    if (!pod) {
      return { output: `error: pods "${name}" not found`, isError: true };
    }
    return { output: pod.logs.join('\n') || `(no logs available for ${pod.name})` };
  }

  // kubectl scale ...
  if (verb === 'scale') {
    const deployArg = parts[2]?.toLowerCase();
    const target = parts[3];
    const replicasArg = parts.find(p => p.startsWith('--replicas='));

    if (!replicasArg) {
      return { output: 'error: flag --replicas=<num> is required. e.g. kubectl scale deploy payment-gateway --replicas=5', isError: true };
    }

    const num = parseInt(replicasArg.split('=')[1], 10);
    if (isNaN(num) || num < 1 || num > 12) {
      return { output: 'error: replicas must be an integer between 1 and 12', isError: true };
    }

    const deploy = state.deployments.find(d => d.name === target || target === `deployment/${d.name}`);
    if (!deploy) {
      return { output: `error: deployments.apps "${target}" not found`, isError: true };
    }

    return {
      output: `deployment.apps/${deploy.name} scaled to ${num} replicas`,
      affectedDeployments: [{ name: deploy.name, replicas: num }],
    };
  }

  // kubectl autoscale ...
  if (verb === 'autoscale') {
    const target = parts[3] || parts[2];
    const minArg = parts.find(p => p.startsWith('--min='));
    const maxArg = parts.find(p => p.startsWith('--max='));
    const cpuArg = parts.find(p => p.startsWith('--cpu-percent='));

    const min = minArg ? parseInt(minArg.split('=')[1], 10) : 2;
    const max = maxArg ? parseInt(maxArg.split('=')[1], 10) : 8;
    const cpu = cpuArg ? parseInt(cpuArg.split('=')[1], 10) : 70;

    const deploy = state.deployments.find(d => d.name === target || target === `deployment/${d.name}`);
    if (!deploy) {
      return { output: `error: deployment "${target}" not found`, isError: true };
    }

    return {
      output: `horizontalpodautoscaler.autoscaling/${deploy.name} autoscaled (min=${min}, max=${max}, targetCPU=${cpu}%)`,
      affectedDeployments: [{ name: deploy.name, hpa: true }],
    };
  }

  // kubectl delete pod ...
  if (verb === 'delete') {
    const resource = parts[2]?.toLowerCase();
    const name = parts[3];

    if (resource === 'pod' || resource === 'po') {
      const pod = state.pods.find(p => p.name.includes(name) || p.id === name);
      if (!pod) {
        return { output: `error: pods "${name}" not found`, isError: true };
      }
      return {
        output: `pod "${pod.name}" deleted`,
        affectedPods: [{ id: pod.id, action: 'delete' }],
      };
    }
    return { output: `error: delete unsupported for "${resource}"`, isError: true };
  }

  // kubectl rollout restart ...
  if (verb === 'rollout') {
    const action = parts[2]?.toLowerCase();
    const target = parts[4] || parts[3];
    if (action === 'restart') {
      const deploy = state.deployments.find(d => d.name.includes(target));
      if (!deploy) {
        return { output: `error: deployment "${target}" not found`, isError: true };
      }
      return {
        output: `deployment.apps/${deploy.name} restarted (rolling update started)`,
        affectedDeployments: [{ name: deploy.name }],
      };
    }
  }

  // kubectl drain node ...
  if (verb === 'drain') {
    const nodeTarget = parts[2] === 'node' ? parts[3] : parts[2];
    const node = state.nodes.find(n => n.name === nodeTarget || n.id === nodeTarget);
    if (!node) {
      return { output: `error: node "${nodeTarget}" not found`, isError: true };
    }
    return {
      output: `node/${node.name} cordoned\nevicting pods from node/${node.name}...\npods evicted and rescheduled to other nodes.\nnode/${node.name} drained successfully`,
      affectedNodes: [{ id: node.id, action: 'drain' }],
    };
  }

  // kubectl uncordon node ...
  if (verb === 'uncordon') {
    const nodeTarget = parts[2] === 'node' ? parts[3] : parts[2];
    const node = state.nodes.find(n => n.name === nodeTarget || n.id === nodeTarget);
    if (!node) {
      return { output: `error: node "${nodeTarget}" not found`, isError: true };
    }
    return {
      output: `node/${node.name} uncordoned`,
      affectedNodes: [{ id: node.id, action: 'uncordon' }],
    };
  }

  // kubectl set resources ...
  if (verb === 'set' && parts[2] === 'resources') {
    const deploy = state.deployments.find(d => parts.some(p => p.includes(d.name)));
    if (!deploy) {
      return { output: 'error: deployment target not recognized', isError: true };
    }
    const memLimitArg = parts.find(p => p.includes('memory='));
    let newMemLimit = deploy.memLimit;
    if (memLimitArg) {
      const match = memLimitArg.match(/memory=(\d+)/);
      if (match) newMemLimit = parseInt(match[1], 10);
    }
    return {
      output: `deployment.apps/${deploy.name} resource limits updated: memory=${newMemLimit}Mi`,
      affectedDeployments: [{ name: deploy.name, memLimit: newMemLimit }],
    };
  }

  // kubectl patch ...
  if (verb === 'patch') {
    const target = parts[3] || parts[2];
    const deploy = state.deployments.find(d => target.includes(d.name));
    if (deploy) {
      return {
        output: `deployment.apps/${deploy.name} patched successfully`,
        affectedDeployments: [{ name: deploy.name }],
      };
    }
    return { output: `resource "${target}" patched`, isError: false };
  }

  return {
    output: `unknown command: ${trimmed}. Type 'help' to see valid kubectl commands.`,
    isError: true,
  };
}
