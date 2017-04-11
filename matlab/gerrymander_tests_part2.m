global parameterlisting stateresults nationalresults symm_ number_of_simulations outputfilename_ starttime

fid=fopen(strcat(outputfilename_,'.html'),'a');

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%% Analysis of Effects: excess seats %%%%%%%%%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
fprintf('%s Test 3\n', datestr(now))
number_of_simulations=1000000;
[meanseats SDseats sigma actual_Dseats total_state_seats num_matching p3]=gerry_fantasy_delegations(stateresults,nationalresults,symm_,number_of_simulations,outputfilename_);
fprintf(fid,'<p><b>Test of Effects: How many extra seats did either party gain relative to party-neutral sampling? (fantasy delegations)</b>: ');
fprintf(fid,'It is possible to estimate how the state''s delegation would be composed if votes were distributed according to natural variations in districting. ');
fprintf(fid,'This is done by drawing districts at random from a large national sample, and then examining combinations whose vote totals are similar to the actual outcome. ');
fprintf(fid,'</p>\n<p></p>\n<p>');

if num_matching>0
    if symm_==0
        fprintf(fid,'In the following simulations, the "fantasy delegations" give a sense of what would happen on average, based on national standards for districting. The sampled districts come from real elections, and therefore the simulations include the Republican advantage arising from population clustering.');
    else
        fprintf(fid,'In the following simulations, individual districts used to build "fantasy delegations" were flipped at random, thus generating a partisan-symmetric distribution. Consequently, these simulations ignore population clustering and show what would occur in a fully partisan-symmetric situation.');
    end
    fprintf(fid,'</p>\n<p></p>\n<p>');

    fprintf(fid,'<IMG SRC="%s_Test3.jpg" border="0" alt="Logo"></p>\n<p>',outputfilename_);

    fprintf(fid,'In this election, the average Democratic vote share across all districts was %2.1f%%, and Democrats won %i seats. ',mean(stateresults)*100, actual_Dseats);
    fprintf(fid,'%i fantasy delegations with the same vote share had an average of %.1f Democratic seats (green symbol), with a standard deviation of %.1f seats (see error bar). ',num_matching,meanseats,SDseats);
    fprintf(fid,'The actual outcome (red symbol) was therefore advantageous to');
    switch 1
        case meanseats-actual_Dseats<0
            fprintf(fid,' Democrats. ');
        case meanseats-actual_Dseats>0
            fprintf(fid,' Republicans. ');
    end

    switch 1
        case p3>0.05
            fprintf(fid,'However, this advantage was not statistically significant. ');
        case p3<=0.05
            fprintf(fid,'This advantage meets established standards for statistical significance, and ');
            if p3>=0.01
                fprintf(fid,'the probability that it would have arisen by partisan-unbiased mechanisms alone is %1.2f. ',p3);
            else
                if p3>=0.001
                    fprintf(fid,'the probability that it would have arisen by partisan-unbiased mechanisms alone is %1.3f. ',p3);
                else
                    fprintf(fid,'the probability that it would have arisen by partisan-unbiased mechanisms alone is less than 0.001. ');
                end
            end
    end
else
    fprintf(fid,'None of the %i simulations had a similar vote share as the actual election results. Change input parameters and try again?',number_of_simulations);
end
fprintf(fid,'</p>\n<p></p>\n<p>');

fprintf(fid,'The above calculations are based on Samuel S.-H. Wang, "Three Tests for Practical Evaluation of Partisan Gerrymandering," 68 Stan. L. Rev. 1263 (2016). For further information, contact sswang@princeton.edu.');
fprintf(fid,'</p>\n<p></p>\n<p>');    

fprintf(fid,['<i>' parameterlisting '</i></p>\n<p></p>\n']);

fclose(fid);
fprintf('%s Done\n', datestr(now))
fprintf('Time elapsed: ')
datetime('now')-starttime % comment this out when running on laptop
