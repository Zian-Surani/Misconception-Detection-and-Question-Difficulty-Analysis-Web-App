
%% figs_plot.m  (IEEE-ready figure generation)
% Place this file and the CSVs in the same folder; then run:
%   run('figs_plot.m')
%
% Creates and saves:
%   - fig_classification_metrics.png
%   - fig_cluster_coherence.png
%   - fig_irt_difficulty.png

close all; clc;

%% Read CSVs
comp = readtable('results_comparison.csv', 'TextType','string');
clus = readtable('cluster_metrics.csv', 'TextType','string');
irt  = readtable('irt_difficulty.csv', 'TextType','string');

%% ---------- Figure 1: Classification Metrics (Precision/Recall/F1) ----------
metrics = ["Precision","Recall","F1"];
M = zeros(height(comp), numel(metrics));
for i=1:numel(metrics)
    col = comp.(metrics(i));
    M(:,i) = arrayfun(@(k) str2double(string(col(k))), (1:height(comp))');
end

figure('Name','Classification Metrics','Color','w');
b = bar(M,'grouped'); %#ok<*NASGU>
xticklabels(comp.Model);
xtickangle(25);
ylabel('Score');
ylim([0 1]);
set(gca,'FontName','Times','FontSize',11,'Box','on');
legend(metrics,'Location','southoutside','Orientation','horizontal');
title('Model Comparison: Precision / Recall / F1');

% overlay numeric labels
hold on;
[ngroups, nbars] = size(M);
for i = 1:nbars
    x = (1:ngroups) - 0.5 + (2*i-1)/(2*nbars);
    for j=1:ngroups
        if ~isnan(M(j,i)) && M(j,i) > 0
            text(x(j), M(j,i)+0.02, sprintf('%.2f', M(j,i)), 'HorizontalAlignment','center','FontName','Times','FontSize',10);
        end
    end
end
grid on;
set(gcf,'PaperPositionMode','auto');
saveas(gcf, 'fig_classification_metrics.png');

%% ---------- Figure 2: Cluster Coherence (Silhouette & CH) ----------
S = arrayfun(@(k) str2double(string(clus.Silhouette(k))), 1:height(clus))';
C = arrayfun(@(k) str2double(string(clus.CalinskiHarabasz(k))), 1:height(clus))';

figure('Name','Cluster Coherence','Color','w');
subplot(2,1,1);
bar(S); ylim([0 1]);
xticklabels(clus.Setting); xtickangle(15);
ylabel('Silhouette');
title('Silhouette Coefficient (Higher is Better)');
set(gca,'FontName','Times','FontSize',11,'Box','on'); grid on;

subplot(2,1,2);
bar(C);
xticklabels(clus.Setting); xtickangle(15);
ylabel('Calinski–Harabasz');
title('Calinski–Harabasz Index (Higher is Better)');
set(gca,'FontName','Times','FontSize',11,'Box','on'); grid on;

set(gcf,'PaperPositionMode','auto');
saveas(gcf, 'fig_cluster_coherence.png');

%% ---------- Figure 3: IRT Difficulty Ladder ----------
bvals = arrayfun(@(k) str2double(string(irt.Difficulty_b(k))), 1:height(irt))';
avals = arrayfun(@(k) str2double(string(irt.Discrimination_a(k))), 1:height(irt))';
valid = ~isnan(bvals);
bvals = bvals(valid); avals = avals(valid); items = irt.ItemID(valid);
[bs, idx] = sort(bvals,'ascend');
items = items(idx); avals = avals(idx);

figure('Name','IRT Difficulty Ladder','Color','w');
bar(bs);
xticklabels(items); xtickangle(45);
ylabel('Difficulty (b)'); xlabel('Items');
title('IRT Difficulty Ladder');
set(gca,'FontName','Times','FontSize',11,'Box','on'); grid on;

yyaxis right;
plot(1:numel(avals), avals, 'o-','LineWidth',1.15,'MarkerSize',4);
ylabel('Discrimination (a)');
legend({'Difficulty (b)','Discrimination (a)'},'Location','southoutside','Orientation','horizontal');

set(gcf,'PaperPositionMode','auto');
saveas(gcf, 'fig_irt_difficulty.png');

disp('Done. Saved: fig_classification_metrics.png, fig_cluster_coherence.png, fig_irt_difficulty.png');
