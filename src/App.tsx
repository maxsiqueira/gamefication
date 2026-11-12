/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import confetti from 'canvas-confetti';
import { 
  Node, 
  Pod, 
  Deployment, 
  Alert, 
  ChaosScenario, 
  Badge, 
  SquadRank, 
  ClusterMetrics, 
  UserProgress 
} from './types/kubernetes';
import { 
  INITIAL_NODES, 
  INITIAL_DEPLOYMENTS, 
  createInitialPods, 
  INITIAL_BADGES, 
  INITIAL_SQUAD_RANKS, 
  CHAOS_SCENARIOS, 
  INITIAL_USER_PROGRESS 
} from './utils/k8sSimulation';
import { sounds } from './utils/audio';

import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { ClusterTopology } from './components/ClusterTopology';
import { TerminalDrawer } from './components/TerminalDrawer';
import { AlertsPanel } from './components/AlertsPanel';
import { ChaosSimulatorModal } from './components/ChaosSimulatorModal';
import { PodInspectorModal } from './components/PodInspectorModal';
import { NodeInspectorModal } from './components/NodeInspectorModal';
import { DeployWorkloadModal } from './components/DeployWorkloadModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { BadgesModal } from './components/BadgesModal';
import { AcademyModal } from './components/AcademyModal';

export default function App() {
  // Game Shell State
  const [gameState, setGameState] = React.useState<'TITLE' | 'PLAYING' | 'PAUSED'>('TITLE');
  const [activeGameMode, setActiveGameMode] = React.useState<'incident' | 'academy' | 'sandbox'>('incident');

  // Kubernetes Cluster State
  const [nodes, setNodes] = React.useState<Node[]>(INITIAL_NODES);
  const [deployments, setDeployments] = React.useState<Deployment[]>(INITIAL_DEPLOYMENTS);
  const [pods, setPods] = React.useState<Pod[]>(createInitialPods());
  const [selectedNamespace, setSelectedNamespace] = React.useState<string>('all');

  // Alerts & Incident Center
  const [alerts, setAlerts] = React.useState<Alert[]>([
    {
      id: 'alert-oom-init',
      type: 'OOMKilled',
      severity: 'warning',
      title: 'Memory Utilization Warning on analytics-worker',
      description: 'Analytics-worker pod memory reached 88% of limit (450MiB/512MiB). High heap allocation detected.',
      targetResource: 'pod/analytics-worker-99ab1-a1',
      timestamp: Date.now() - 120000,
      resolved: false,
      suggestedAction: 'Increase memory limit to 1024Mi to avoid container crash.',
      autoFixCommand: 'kubectl set resources deploy analytics-worker --limits=memory=1024Mi',
    },
  ]);

  // Gamification, Leveling & Badges
  const [userProgress, setUserProgress] = React.useState<UserProgress>(INITIAL_USER_PROGRESS);
  const [badges, setBadges] = React.useState<Badge[]>(INITIAL_BADGES);
  const [squadRanks, setSquadRanks] = React.useState<SquadRank[]>(INITIAL_SQUAD_RANKS);

  // Chaos Simulator Scenarios
  const [scenarios, setScenarios] = React.useState<ChaosScenario[]>(CHAOS_SCENARIOS);
  const [activeScenario, setActiveScenario] = React.useState<ChaosScenario | null>(null);
  const [scenarioTimeLeft, setScenarioTimeLeft] = React.useState<number>(0);

  // Modals & UI Drawers
  const [terminalOpen, setTerminalOpen] = React.useState<boolean>(false);
  const [alertsModalOpen, setAlertsModalOpen] = React.useState<boolean>(false);
  const [chaosModalOpen, setChaosModalOpen] = React.useState<boolean>(false);
  const [deployModalOpen, setDeployModalOpen] = React.useState<boolean>(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = React.useState<boolean>(false);
  const [badgesModalOpen, setBadgesModalOpen] = React.useState<boolean>(false);
  const [academyModalOpen, setAcademyModalOpen] = React.useState<boolean>(false);
  const [inspectPod, setInspectPod] = React.useState<Pod | null>(null);
  const [inspectNode, setInspectNode] = React.useState<Node | null>(null);

  // Global Cluster Metrics
  const [metrics, setMetrics] = React.useState<ClusterMetrics>({
    healthScore: 94,
    sloPercent: 99.98,
    costPerHour: 2.18,
    efficiencyPercent: 82,
    totalRps: 1840,
    errorRatePercent: 0.02,
    activeAlertsCount: 1,
    uptimeSeconds: 14200,
  });

  // Award XP and handle level-ups
  const awardXp = React.useCallback((amount: number) => {
    setUserProgress(prev => {
      const newXp = prev.xp + amount;
      let newLevel = prev.level;
      let newNextXp = prev.nextLevelXp;
      let newTitle = prev.title;

      if (newXp >= prev.nextLevelXp) {
        newLevel += 1;
        newNextXp = Math.round(prev.nextLevelXp * 1.5);
        sounds.playLevelUp();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        const titles = [
          'Kube Cadet',
          'Cluster Operator',
          'Deployment Specialist',
          'Incident Commander',
          'Chaos Architect',
          'Site Reliability Overlord',
        ];
        newTitle = titles[Math.min(titles.length - 1, newLevel - 1)];
      }

      return {
        ...prev,
        level: newLevel,
        xp: newXp,
        nextLevelXp: newNextXp,
        title: newTitle,
        resolvedIncidentsCount: prev.resolvedIncidentsCount + 1,
      };
    });
  }, []);

  // Unlock Badge helper
  const unlockBadge = React.useCallback((badgeId: string) => {
    setBadges(prev => {
      return prev.map(b => {
        if (b.id === badgeId && !b.unlocked) {
          sounds.playLevelUp();
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.5 },
          });
          return { ...b, unlocked: true, unlockedAt: Date.now() };
        }
        return b;
      });
    });
  }, []);

  // Keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;

      // Don't trigger shortcuts if user is typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        sounds.playBlip(500);
        setTerminalOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // Close modals if open, else toggle terminal
        if (inspectPod) setInspectPod(null);
        else if (inspectNode) setInspectNode(null);
        else if (alertsModalOpen) setAlertsModalOpen(false);
        else if (chaosModalOpen) setChaosModalOpen(false);
        else if (deployModalOpen) setDeployModalOpen(false);
        else if (leaderboardModalOpen) setLeaderboardModalOpen(false);
        else if (badgesModalOpen) setBadgesModalOpen(false);
        else if (academyModalOpen) setAcademyModalOpen(false);
        else if (terminalOpen) setTerminalOpen(false);
      } else if (e.key === '1') {
        setSelectedNamespace('all');
      } else if (e.key === '2') {
        setChaosModalOpen(true);
      } else if (e.key === '3') {
        setDeployModalOpen(true);
      } else if (e.key === '4') {
        setAcademyModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    gameState,
    inspectPod,
    inspectNode,
    alertsModalOpen,
    chaosModalOpen,
    deployModalOpen,
    leaderboardModalOpen,
    badgesModalOpen,
    academyModalOpen,
    terminalOpen,
  ]);

  // Simulation Tick (Every 1.5 seconds)
  React.useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const interval = setInterval(() => {
      // 1. Advance Pod Metrics & Memory Leak Simulation
      setPods(prevPods => {
        return prevPods.map(pod => {
          let updatedUsage = pod.memUsage;
          let updatedStatus = pod.status;
          let updatedRestarts = pod.restarts;
          let updatedLogs = [...pod.logs];

          // If pod has a simulated memory leak
          if (pod.hasMemoryLeak && pod.status === 'Running') {
            updatedUsage += 45; // rapid climb
            if (updatedUsage >= pod.memLimit) {
              updatedStatus = 'OOMKilled';
              updatedRestarts += 1;
              updatedLogs.push(`[kernel] Out of memory: Kill process (PID 4810, ${pod.name}) score 980`);
              sounds.playAlert();
              unlockBadge('badge-oom-tamer');

              // Create OOM Alert
              setAlerts(prevAlerts => [
                {
                  id: `oom-${Date.now()}`,
                  type: 'OOMKilled',
                  severity: 'critical',
                  title: `Container OOMKilled on ${pod.name}`,
                  description: `Process exceeded memory limit of ${pod.memLimit}MiB. Linux cgroups terminated container.`,
                  targetResource: `pod/${pod.name}`,
                  timestamp: Date.now(),
                  resolved: false,
                  suggestedAction: `Increase deployment memory limit to ${pod.memLimit * 2}MiB or patch heap allocation.`,
                  autoFixCommand: `kubectl set resources deploy ${pod.deploymentName} --limits=memory=${pod.memLimit * 2}Mi`,
                },
                ...prevAlerts,
              ]);
            }
          }

          // Liveness probe check for failing pods
          if (!pod.livenessProbe.healthy && pod.status === 'Running') {
            updatedStatus = 'CrashLoopBackOff';
            updatedRestarts += 1;
            updatedLogs.push(`[kubelet] Liveness probe failed on port ${pod.livenessProbe.port}: connection refused`);
          }

          return {
            ...pod,
            memUsage: updatedUsage,
            status: updatedStatus,
            restarts: updatedRestarts,
            logs: updatedLogs.slice(-15),
            ageSeconds: pod.ageSeconds + 2,
          };
        });
      });

      // 2. Active Scenario Countdown & Verification
      if (activeScenario) {
        setScenarioTimeLeft(prevTime => {
          if (prevTime <= 1) {
            // Scenario timed out
            sounds.playAlert();
            setActiveScenario(null);
            return 0;
          }
          return prevTime - 1;
        });

        // Scenario Success Condition Checks
        if (activeScenario.id === 'scenario-oom') {
          // Check if analytics-worker memory limit was increased >= 1024
          const analyticsDeploy = deployments.find(d => d.name === 'analytics-worker');
          if (analyticsDeploy && analyticsDeploy.memLimit >= 1024) {
            awardXp(activeScenario.xpReward);
            unlockBadge('badge-oom-tamer');
            setActiveScenario(null);
          }
        } else if (activeScenario.id === 'scenario-traffic') {
          // Check if payment-gateway scaled >= 6 replicas
          const paymentDeploy = deployments.find(d => d.name === 'payment-gateway');
          if (paymentDeploy && paymentDeploy.replicas >= 6) {
            awardXp(activeScenario.xpReward);
            unlockBadge('badge-hpa-overlord');
            setActiveScenario(null);
          }
        } else if (activeScenario.id === 'scenario-node') {
          // Check if node-prod-pool-01 is drained
          const targetNode = nodes.find(n => n.name === 'node-prod-pool-01');
          if (targetNode && targetNode.cordoned) {
            awardXp(activeScenario.xpReward);
            unlockBadge('badge-chaos-survivor');
            setActiveScenario(null);
          }
        }
      }

      // 3. Recalculate Node Metrics based on Hosted Pods
      setNodes(prevNodes => {
        return prevNodes.map(node => {
          if (node.role === 'control-plane') return node;
          const hosted = pods.filter(p => p.nodeId === node.id && p.status === 'Running');
          const sumCpu = hosted.reduce((acc, p) => acc + p.cpuUsage, 600);
          const sumMem = hosted.reduce((acc, p) => acc + p.memUsage, 1500);

          return {
            ...node,
            cpuUsage: sumCpu,
            memUsage: sumMem,
          };
        });
      });

      // 4. Update Cluster Health Metrics
      const activeAlerts = alerts.filter(a => !a.resolved);
      const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
      const warningCount = activeAlerts.filter(a => a.severity === 'warning').length;
      const calculatedHealth = Math.max(20, Math.min(100, 100 - criticalCount * 18 - warningCount * 5));

      setMetrics(prev => ({
        ...prev,
        healthScore: calculatedHealth,
        activeAlertsCount: activeAlerts.length,
        sloPercent: criticalCount > 0 ? Math.max(98.5, prev.sloPercent - 0.01) : Math.min(99.99, prev.sloPercent + 0.005),
        uptimeSeconds: prev.uptimeSeconds + 2,
      }));
    }, 1500);

    return () => clearInterval(interval);
  }, [gameState, activeScenario, deployments, nodes, pods, alerts, awardXp, unlockBadge]);

  // Command Effect Handler from CLI Terminal
  const handleApplyCommandEffects = (effects: {
    affectedDeployments?: { name: string; replicas?: number; cpuLimit?: number; memLimit?: number; cpuReq?: number; memReq?: number; hpa?: boolean }[];
    affectedPods?: { id: string; action: 'delete' | 'restart' | 'patch' }[];
    affectedNodes?: { id: string; action: 'drain' | 'uncordon' }[];
  }) => {
    // 1. Deployments updates (scaling, limits, HPA)
    if (effects.affectedDeployments) {
      effects.affectedDeployments.forEach(aff => {
        setDeployments(prev =>
          prev.map(d => {
            if (d.name === aff.name) {
              const updatedReplicas = aff.replicas ?? d.replicas;
              const updatedMemLimit = aff.memLimit ?? d.memLimit;
              const updatedHpa = aff.hpa ?? d.hpaEnabled;

              // If scaling, adjust pods count
              if (aff.replicas && aff.replicas !== d.replicas) {
                handleScaleDeployment(d.name, aff.replicas - d.replicas);
              }

              // If memory limit patched, update hosted pods too
              if (aff.memLimit) {
                setPods(podList =>
                  podList.map(p =>
                    p.deploymentName === d.name
                      ? { ...p, memLimit: updatedMemLimit, status: 'Running', hasMemoryLeak: false }
                      : p
                  )
                );
              }

              return {
                ...d,
                replicas: updatedReplicas,
                desiredReplicas: updatedReplicas,
                availableReplicas: updatedReplicas,
                memLimit: updatedMemLimit,
                hpaEnabled: updatedHpa,
              };
            }
            return d;
          })
        );
      });
      awardXp(80);
    }

    // 2. Pods updates (delete, restart)
    if (effects.affectedPods) {
      effects.affectedPods.forEach(pEffect => {
        if (pEffect.action === 'delete') {
          handleDeletePod(pEffect.id);
        } else if (pEffect.action === 'restart') {
          handleRestartPod(pEffect.id);
        }
      });
      awardXp(60);
    }

    // 3. Nodes updates (drain, uncordon)
    if (effects.affectedNodes) {
      effects.affectedNodes.forEach(nEffect => {
        if (nEffect.action === 'drain') {
          handleDrainNode(nEffect.id);
        } else if (nEffect.action === 'uncordon') {
          handleToggleCordon(nEffect.id);
        }
      });
      awardXp(120);
    }
  };

  // Restart Pod
  const handleRestartPod = (podId: string) => {
    setPods(prev =>
      prev.map(p => {
        if (p.id === podId) {
          return {
            ...p,
            status: 'Running',
            memUsage: Math.round(p.memLimit * 0.4),
            hasMemoryLeak: false,
            livenessProbe: { ...p.livenessProbe, healthy: true, failCount: 0 },
            logs: [...p.logs, '[kubelet] Container restarted gracefully: pid 5102 running'],
          };
        }
        return p;
      })
    );
  };

  // Delete Pod (ReplicaSet will reschedule)
  const handleDeletePod = (podId: string) => {
    setPods(prev => {
      const target = prev.find(p => p.id === podId);
      if (!target) return prev;
      const filtered = prev.filter(p => p.id !== podId);

      // Spawn replacement pod after 1s
      setTimeout(() => {
        const replacement: Pod = {
          ...target,
          id: `pod-${Date.now()}`,
          name: `${target.deploymentName}-${Math.random().toString(36).substring(2, 7)}`,
          status: 'Running',
          restarts: 0,
          ageSeconds: 5,
          hasMemoryLeak: false,
          logs: ['[kubelet] Pod created and scheduled by default-scheduler'],
        };
        setPods(curr => [...curr, replacement]);
        sounds.playPodDeploy();
      }, 1000);

      return filtered;
    });
  };

  // Patch Memory Limit on a pod & parent deployment
  const handlePatchMemoryLimit = (podId: string, newLimitMi: number) => {
    setPods(prev =>
      prev.map(p => {
        if (p.id === podId) {
          return {
            ...p,
            memLimit: newLimitMi,
            status: 'Running',
            hasMemoryLeak: false,
          };
        }
        return p;
      })
    );

    // Auto-resolve corresponding alert
    setAlerts(prev =>
      prev.map(a => (a.targetResource.includes(podId) ? { ...a, resolved: true } : a))
    );
    awardXp(100);
  };

  // Scale Deployment
  const handleScaleDeployment = (deploymentName: string, delta: number) => {
    setDeployments(prev =>
      prev.map(d => {
        if (d.name === deploymentName) {
          const newReplicas = Math.max(1, Math.min(10, d.replicas + delta));
          return { ...d, replicas: newReplicas, desiredReplicas: newReplicas, availableReplicas: newReplicas };
        }
        return d;
      })
    );

    if (delta > 0) {
      // Add new pods
      const targetDeploy = deployments.find(d => d.name === deploymentName);
      if (targetDeploy) {
        const workerNodes = nodes.filter(n => n.role === 'worker' && !n.cordoned);
        for (let i = 0; i < delta; i++) {
          const assignedNode = workerNodes[i % workerNodes.length] || nodes[1];
          const newPod: Pod = {
            id: `pod-${Date.now()}-${i}`,
            name: `${deploymentName}-${Math.random().toString(36).substring(2, 8)}`,
            namespace: targetDeploy.namespace,
            deploymentName,
            nodeId: assignedNode.id,
            status: 'Running',
            restarts: 0,
            cpuRequest: targetDeploy.cpuRequest,
            cpuLimit: targetDeploy.cpuLimit,
            cpuUsage: targetDeploy.cpuRequest,
            memRequest: targetDeploy.memRequest,
            memLimit: targetDeploy.memLimit,
            memUsage: Math.round(targetDeploy.memRequest * 1.1),
            qosClass: 'Burstable',
            ageSeconds: 2,
            ip: `10.244.${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 80) + 10}`,
            ports: [8080],
            logs: [`[init] Pod scaled up by controller-manager on ${assignedNode.name}`],
            livenessProbe: { path: '/healthz', port: 8080, periodSeconds: 10, healthy: true, failCount: 0 },
          };
          setPods(curr => [...curr, newPod]);
        }
        sounds.playPodDeploy();
      }
    } else if (delta < 0) {
      // Scale down (remove latest pods of this deployment)
      setPods(curr => {
        const matching = curr.filter(p => p.deploymentName === deploymentName);
        const toRemove = matching.slice(delta).map(p => p.id);
        sounds.playPodDelete();
        return curr.filter(p => !toRemove.includes(p.id));
      });
    }
  };

  // Drain Node (Evict pods to other healthy nodes)
  const handleDrainNode = (nodeId: string) => {
    // 1. Cordon node
    setNodes(prev =>
      prev.map(n => (n.id === nodeId ? { ...n, cordoned: true, status: 'NotReady' } : n))
    );

    // 2. Find healthy available worker nodes
    const otherNodes = nodes.filter(n => n.role === 'worker' && n.id !== nodeId && !n.cordoned);
    if (otherNodes.length === 0) return;

    // 3. Move pods
    setPods(prev =>
      prev.map(p => {
        if (p.nodeId === nodeId) {
          const nextNode = otherNodes[Math.floor(Math.random() * otherNodes.length)];
          return {
            ...p,
            nodeId: nextNode.id,
            logs: [...p.logs, `[eviction] Evicted from ${nodeId} -> safely assigned to ${nextNode.name}`],
          };
        }
        return p;
      })
    );

    awardXp(200);
  };

  // Toggle Cordon Node
  const handleToggleCordon = (nodeId: string) => {
    setNodes(prev =>
      prev.map(n =>
        n.id === nodeId ? { ...n, cordoned: !n.cordoned, status: n.cordoned ? 'Ready' : n.status } : n
      )
    );
  };

  // Start Chaos Scenario
  const handleStartScenario = (scenario: ChaosScenario) => {
    sounds.playAlert();
    setActiveScenario(scenario);
    setScenarioTimeLeft(scenario.timeLimitSec);
    setChaosModalOpen(false);

    if (scenario.id === 'scenario-oom') {
      // Inject memory leak into analytics-worker pod
      setPods(prev =>
        prev.map(p =>
          p.deploymentName === 'analytics-worker'
            ? { ...p, hasMemoryLeak: true, logs: [...p.logs, '[warning] Memory leak: unreleased telemetry buffer stream'] }
            : p
        )
      );
    } else if (scenario.id === 'scenario-traffic') {
      // Inbound traffic surge on payment-gateway
      setPods(prev =>
        prev.map(p =>
          p.deploymentName === 'payment-gateway'
            ? { ...p, cpuUsage: Math.round(p.cpuLimit * 0.96) }
            : p
        )
      );
      setAlerts(prev => [
        {
          id: `traffic-spike-${Date.now()}`,
          type: 'CpuThrottling',
          severity: 'critical',
          title: 'Payment Gateway CPU Throttling (98%)',
          description: 'High transaction surge! CPU limit saturated. Scale deployment or enable HPA.',
          targetResource: 'deployment/payment-gateway',
          timestamp: Date.now(),
          resolved: false,
          suggestedAction: 'Scale replicas to 6 or configure HPA to absorb traffic.',
          autoFixCommand: 'kubectl scale deploy payment-gateway --replicas=6',
        },
        ...prev,
      ]);
    } else if (scenario.id === 'scenario-probe') {
      // Break probe
      setPods(prev =>
        prev.map(p =>
          p.deploymentName === 'frontend-edge'
            ? {
                ...p,
                livenessProbe: { ...p.livenessProbe, path: '/bad-healthz', healthy: false },
                logs: [...p.logs, '[error] Probe target /bad-healthz returned HTTP 404 Not Found'],
              }
            : p
        )
      );
    } else if (scenario.id === 'scenario-node') {
      // Node panic
      setNodes(prev =>
        prev.map(n =>
          n.name === 'node-prod-pool-01' ? { ...n, status: 'NotReady' } : n
        )
      );
    }
  };

  // Deploy New Workload
  const handleDeployWorkload = (newDeploy: Deployment) => {
    setDeployments(prev => [...prev, newDeploy]);

    // Schedule pods onto worker nodes
    const workerNodes = nodes.filter(n => n.role === 'worker' && !n.cordoned);
    const newPods: Pod[] = [];

    for (let i = 0; i < newDeploy.replicas; i++) {
      const targetNode = workerNodes[i % workerNodes.length] || nodes[1];
      newPods.push({
        id: `pod-${Date.now()}-${i}`,
        name: `${newDeploy.name}-${Math.random().toString(36).substring(2, 7)}`,
        namespace: newDeploy.namespace,
        deploymentName: newDeploy.name,
        nodeId: targetNode.id,
        status: 'Running',
        restarts: 0,
        cpuRequest: newDeploy.cpuRequest,
        cpuLimit: newDeploy.cpuLimit,
        cpuUsage: newDeploy.cpuRequest,
        memRequest: newDeploy.memRequest,
        memLimit: newDeploy.memLimit,
        memUsage: Math.round(newDeploy.memRequest * 1.1),
        qosClass: 'Burstable',
        ageSeconds: 1,
        ip: `10.244.${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 80) + 10}`,
        ports: [80],
        logs: [`Container initialized with image: ${newDeploy.image}`],
        livenessProbe: { path: '/healthz', port: 80, periodSeconds: 10, healthy: true, failCount: 0 },
      });
    }

    setPods(curr => [...curr, newPods[0], ...newPods.slice(1)]);
    awardXp(150);
    unlockBadge('badge-grand-architect');
  };

  // Quick Resolve Alert
  const handleResolveAlert = (alertId: string, fixCommand: string) => {
    setAlerts(prev =>
      prev.map(a => (a.id === alertId ? { ...a, resolved: true } : a))
    );
    // Parse fix command
    if (fixCommand.includes('scale')) {
      handleScaleDeployment('payment-gateway', 3);
    } else if (fixCommand.includes('limits=memory=')) {
      setPods(prev =>
        prev.map(p => ({
          ...p,
          memLimit: 1024,
          status: 'Running',
          hasMemoryLeak: false,
        }))
      );
    }
    awardXp(100);
  };

  return (
    <div className="min-h-screen w-full bg-[#070b12] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {gameState === 'TITLE' ? (
        <TitleScreen
          userProgress={userProgress}
          onStartGame={mode => {
            setActiveGameMode(mode);
            setGameState('PLAYING');
            if (mode === 'incident') {
              setChaosModalOpen(true);
            } else if (mode === 'academy') {
              setAcademyModalOpen(true);
            }
          }}
          onOpenLeaderboard={() => setLeaderboardModalOpen(true)}
          onOpenBadges={() => setBadgesModalOpen(true)}
        />
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Real-Time Low-Occlusion HUD */}
          <GameHUD
            metrics={metrics}
            userProgress={userProgress}
            activeAlertsCount={metrics.activeAlertsCount}
            terminalOpen={terminalOpen}
            onToggleTerminal={() => setTerminalOpen(prev => !prev)}
            onOpenAlerts={() => setAlertsModalOpen(true)}
            onOpenLeaderboard={() => setLeaderboardModalOpen(true)}
            onOpenBadges={() => setBadgesModalOpen(true)}
            onOpenChaosModal={() => setChaosModalOpen(true)}
            onExitToTitle={() => setGameState('TITLE')}
          />

          {/* Active Chaos Scenario Banner */}
          {activeScenario && (
            <div className="bg-red-950/80 border-b border-red-800 px-4 py-2 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-red-300 font-bold uppercase">Active Simulation:</span>
                <span className="text-white">{activeScenario.title}</span>
                <span className="text-slate-400 hidden sm:inline">— {activeScenario.objective}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-300">SLA: <strong className="text-red-400 tabular-nums">{scenarioTimeLeft}s</strong></span>
                <button
                  onClick={() => {
                    sounds.playBlip();
                    setActiveScenario(null);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Main Cluster Monitoring Canvas */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-24">
            <ClusterTopology
              nodes={nodes}
              pods={pods}
              deployments={deployments}
              selectedNamespace={selectedNamespace}
              onSelectNamespace={setSelectedNamespace}
              onSelectPod={pod => setInspectPod(pod)}
              onSelectNode={node => setInspectNode(node)}
              onOpenDeployModal={() => setDeployModalOpen(true)}
              onOpenChaosModal={() => setChaosModalOpen(true)}
              onRestartPod={handleRestartPod}
            />
          </main>

          {/* Terminal CLI Drawer */}
          <TerminalDrawer
            isOpen={terminalOpen}
            onClose={() => setTerminalOpen(false)}
            nodes={nodes}
            pods={pods}
            deployments={deployments}
            onApplyCommandEffects={handleApplyCommandEffects}
          />

          {/* Incident / Alerts Panel Modal */}
          <AlertsPanel
            isOpen={alertsModalOpen}
            onClose={() => setAlertsModalOpen(false)}
            alerts={alerts}
            onResolveAlert={handleResolveAlert}
          />

          {/* Chaos Engineering Simulator Modal */}
          <ChaosSimulatorModal
            isOpen={chaosModalOpen}
            onClose={() => setChaosModalOpen(false)}
            scenarios={scenarios}
            activeScenario={activeScenario}
            scenarioTimeLeft={scenarioTimeLeft}
            onStartScenario={handleStartScenario}
            onAbortScenario={() => setActiveScenario(null)}
          />

          {/* Workload Deployer Modal */}
          <DeployWorkloadModal
            isOpen={deployModalOpen}
            onClose={() => setDeployModalOpen(false)}
            onDeploy={handleDeployWorkload}
          />

          {/* Pod Inspector Modal */}
          <PodInspectorModal
            pod={inspectPod}
            deployment={deployments.find(d => d.name === inspectPod?.deploymentName)}
            onClose={() => setInspectPod(null)}
            onRestartPod={handleRestartPod}
            onPatchMemoryLimit={handlePatchMemoryLimit}
            onScaleDeployment={(depName, delta) => handleScaleDeployment(depName, delta)}
            onDeletePod={handleDeletePod}
          />

          {/* Node Inspector Modal */}
          <NodeInspectorModal
            node={inspectNode}
            pods={pods}
            onClose={() => setInspectNode(null)}
            onDrainNode={handleDrainNode}
            onToggleCordon={handleToggleCordon}
          />

          {/* DevOps Squad Leaderboard Modal */}
          <LeaderboardModal
            isOpen={leaderboardModalOpen}
            onClose={() => setLeaderboardModalOpen(false)}
            ranks={squadRanks}
          />

          {/* Badges & Achievements Modal */}
          <BadgesModal
            isOpen={badgesModalOpen}
            onClose={() => setBadgesModalOpen(false)}
            badges={badges}
          />

          {/* Kube Academy Modal */}
          <AcademyModal
            isOpen={academyModalOpen}
            onClose={() => setAcademyModalOpen(false)}
            onRunAcademyCommand={cmd => {
              setTerminalOpen(true);
              handleApplyCommandEffects({});
            }}
          />
        </div>
      )}
    </div>
  );
}
