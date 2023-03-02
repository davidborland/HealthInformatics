/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package preprocessdiabetes;

import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Set;
import java.util.TreeSet;
import java.util.Vector;
import java.util.ArrayList;

/**
 *
 * @author hrs13
 */
public class PreprocessDiabetes {

    public static void main(String args[])
	{
		String filename = "E:\\borland\\data\\DoD_HealthInformatics\\DEDUCE\\Diabetes2\\Run102914-1855pts with glucose\\Processed\\patient_HbA1c_glucose.csv";
                String deathfile = "E:\\borland\\data\\DoD_HealthInformatics\\DEDUCE\\Diabetes2\\Run102914-1855pts with glucose\\Processed\\patient_death.csv";
                String demographicsfile = "E:\\borland\\data\\DoD_HealthInformatics\\DEDUCE\\Diabetes2\\Run102914-1855pts with glucose\\Processed\\patient_demographics.csv";
                
		PreprocessDiabetes diabdata = new PreprocessDiabetes(filename, deathfile, demographicsfile, -1);
		diabdata.readTheCSVFile();
		//System.out.println(bpdata);
		//bpdata.sampleAndWriteCSVFile("/Users/hinajoshi/Documents/Development/DCHI/Data/TATRC_R0.6_DS1_CSV/Table.csv");
		diabdata.sampleAndWriteCSVFile("E:\\borland\\src\\HealthInformatics\\Diabetes\\DeduceDiabetes2Table_HbA1c_glucose_demographics_10years_numbers.csv");
		diabdata.printMinMaxDate();
	}
                
        private enum LabType {
            HBA1C,
            GLUCOSE,
            NONE
        }
	
	//Define a data structure to hold the values from the csv file.
	//Basically the columns will be Patient-IDs, a byte value indicating code for BP-classification, encounter date
	private class record implements Comparable<record>{
		int hba1c;
		Date encounter_date;
                LabType lab_type;
		
		record(int hba1c, Date encounter_date, LabType lab_type){
			this.hba1c = hba1c;
			this.encounter_date = encounter_date;
                        this.lab_type = lab_type;
		}
                
                @Override
                public int compareTo(record r)
                {
                    return (this.encounter_date).compareTo(r.encounter_date);
                }
	}
        	
	private class wrapperList{
		private LinkedList<record> list;
                private ArrayList<String> demographics;
		
		public void add(int hba1c, Date date, LabType lab_type)
		{
			list.add(new record(hba1c, date, lab_type));
		}
                
                public void addDemographic(String value) {
                    demographics.add(value);
                }
		
		public int size() { 
			return list.size();
		}
		
		public record getAt(int index){
			if(index>=0 && index<list.size())
				return list.get(index);
			else
				return null;
		}
                
                public void sort(boolean asc)
                {
                    if(asc)
                        Collections.sort(list);
                    else
                        Collections.sort(list, Collections.reverseOrder());
                }
                
		wrapperList(){
			list = new LinkedList<record>();
                        demographics = new ArrayList<String>();
		}
	}
 	
	//Read in the csv file and process it to divide the main column values
 	public void readTheCSVFile()
 	{
 		BufferedReader br = null;
 		String line = "";
 		String cvsSplitBy = ",";
		SimpleDateFormat sdf = new SimpleDateFormat("MM/dd/yy HH:mm");
                
 		try {
                        TreeSet<Date> dates = new TreeSet<Date>(); 
                        //Compensate for death data
                        //Create the records_table right away from the Death.csv file..
                        //The first value of hba1c will be 0, indicating death, death will be the last date of the calendar year specified
                        br = new BufferedReader(new FileReader(deathfilename));
                        line = br.readLine();
                        Calendar c = Calendar.getInstance();
                        while ((line = br.readLine()) != null) {
                            String[] fields = line.split(cvsSplitBy);
                            if(fields.length>1 && !fields[1].isEmpty())
                            {
                                wrapperList l = new wrapperList();;
                                l.add(0, sdf.parse(fields[1]), LabType.NONE);
                                records_table.put(fields[0], l);                                
                            }
                        }                
                        
                        // Add demographics
                        br = new BufferedReader(new FileReader(genderfilename));
                        
                        // Get demographic types
                        line = br.readLine();
                        String[] types = line.split(cvsSplitBy);
                        for (int i = 1; i < types.length; i++) {
                            demographicTypes.add(types[i]);
                        }
                        
                        // Get demographics values for each patient
                        while ((line = br.readLine()) != null) {
                            String[] fields = line.split(cvsSplitBy);
                              if (records_table.containsKey(fields[0])) {
                                  for (int i = 1; i < fields.length; i++) {
                                      records_table.get(fields[0]).addDemographic(fields[i]);
                                  }
                              }
                        }
                
 			br = new BufferedReader(new FileReader(filename));
 			//Skip the header line
 			line = br.readLine();
 			while ((line = br.readLine()) != null) {
 		//	while((number_records--)>0){
 		//		line = br.readLine();
 			    // use comma as separator
 				String[] fields = line.split(cvsSplitBy);
                                
                                // DMB: Changed fields indeces below because new data set with glucose does not contain Encounter_ID column
                                // DMB: Added imputation of hba1c values from glucose values
 				
 				wrapperList l;
 				if(records_table.containsKey(fields[0]))
                                {
 					l = records_table.get(fields[0]);
                              //  else //Remove this once the death data has been added
 			//		l = new wrapperList();
 				//l.add(Integer.parseInt(fields[2]), Integer.parseInt(fields[3]), sdf.parse(fields[1]));
                                        if(fields[2].isEmpty())
                                        {
                                            //There is no data for this patient in the labs file, do necessary processing here for any indicators
                                        }
                                        else{
                                            try {
                                                // See if we can parse the value
                                                float value = Float.parseFloat(fields[1]);
                                                                                                                                               
                                                int hba1c;
                                                Date enc_dt = sdf.parse(fields[3]);
                                                LabType lab_type; 
                                                if (fields[2].contains("GLUCOSE") ||
                                                    fields[2].contains("Glucose")) {
                                                    // Impute
                                                    
                                                    // Standard 
                                                    hba1c = (int)((value + 46.7) / 28.7) * 10;
                                                    
                                                    // Igor
                                                    //hba1c = (int)(5.177 + 0.0166 * value) * 10;
                                                    
                                                    lab_type = LabType.GLUCOSE;
                                                }
                                                else if (fields[2].contains("HGB") ||
                                                         fields[2].contains("A1C") ||
                                                         fields[2].contains("GLYCO")) {
                                                    hba1c = (int)(value * 10);
                                                    lab_type = LabType.HBA1C;
                                                }
                                                else {
                                                    System.out.println("Unknown lab: " + fields[2]);
                                                    continue;
                                                }
                                                                                                
                                                l.add(hba1c, enc_dt, lab_type);
                                                //Modify the wrapper list
                                                records_table.put(fields[0], l);
                                                dates.add(enc_dt);
                                            }
                                            catch (NumberFormatException e) {
                                                // Ignore
                                                System.out.println("Can't parse lab value: " + fields[1]);
                                            }
                                        }
                                }
 			}
                        //Process records_table to:
                        // Remove the lists that have a list of only size 1, may require special processing later
                        // Sort each list by date, and adjust death date
                        Set<String> patient_ids = records_table.keySet();
                        Object[] arr = patient_ids.toArray();
                        int size = patient_ids.size();
                        for(int id = 0; id<size; id++)
 			{
                            String cur_id = (String)arr[id];
                            if(id==188)
                                id=188; // DMB : ???
                            wrapperList l = records_table.get(cur_id);
                            if(l.size()==1)
                            {
                                //Did not find any other records in the labs table for this patient, remove it
                                records_table.remove(cur_id);
                            }
                            else
                            {
                               l.sort(false); //sort in descending order
                               //Check if the first element is the death record
                               record r0 = l.getAt(0);
                               c.setTime(r0.encounter_date);
                               int endYear = c.get(Calendar.YEAR);
                               c.setTime(l.getAt(l.size()-1).encounter_date);
                               int startYear = c.get(Calendar.YEAR);
                            
                               int yearThreshold = 10;
                               if(endYear - startYear - 1 > yearThreshold)
                               // DMB: For only glucose, which doesn't go back as far.
                               //if(endYear - startYear >= 0)
                               {
                                if(r0.hba1c == 0)
                                {
                                    c.setTime(r0.encounter_date);
                                    c.add(Calendar.MONTH, -6);
                                    Date halfYearPrev = c.getTime();
                                    c.set(Calendar.DAY_OF_YEAR,1);
                                    Date firstDayYear = c.getTime();
                                    record r1 = l.getAt(1);
                                    if(r1.encounter_date.before(halfYearPrev) && r1.encounter_date.after(firstDayYear))
                                        l.getAt(0).encounter_date = halfYearPrev;
                                    else if(r1.encounter_date.before(firstDayYear))
                                        l.getAt(0).encounter_date=firstDayYear;
                                    dates.add(l.getAt(0).encounter_date);
                                }
                                else {
                                   // throw(new RuntimeException("Wrong data, death date should be the highest one for this patient "+cur_id));
                                    System.out.println("Wrong data, death date should be the highest one for this patient "+cur_id);
                                    records_table.remove(cur_id);
                                }
                               }
                               else {
                                   records_table.remove(cur_id);
                               }
                            }
                        }
                        minDate = Collections.min(dates);
 			maxDate = Collections.max(dates);
 		}catch(ParseException e){
 			e.printStackTrace();
 		}catch (FileNotFoundException e) {
 			e.printStackTrace();
 		} catch (IOException e) {
 			e.printStackTrace();
 		} finally {
 			if (br != null) {
 				try {
 					br.close();
 				} catch (IOException e) {
 					e.printStackTrace();
 				}
 			}
 		}
 		System.out.println("Done");
 	}

        @Override
 	public String toString()
 	{
 		return "";
 	}
 	
	//Write the csv file in proper format
 	public void sampleAndWriteCSVFile(String out_csvFile)
 	{
 		Calendar cal = Calendar.getInstance();
 		cal.setTime(minDate);
 		int minYear = cal.get(Calendar.YEAR);
 		cal.setTime(maxDate);
 		int samples = (cal.get(Calendar.YEAR)+1-minYear)*2;
 		int maxYear = cal.get(Calendar.YEAR);
 		//Store the intervals (intervals has one extra date, just to help in binning) 
 		Vector<Date> intervals = new Vector<Date>(samples+1);
 		cal.set(Calendar.YEAR, maxYear); //Going backwards in time
 		for(int i=0; i<samples; i++) //compensate for last event
 		{
 			intervals.add(i, cal.getTime());
 			cal.add(Calendar.MONTH, -6);
 		}
 		
 		//Prepare structures;
 		Vector<String> tableRow = new Vector<String>(samples);	
 		int hba1cSum[] = new int[samples];
                int hba1cGlucoseSum[] = new int[samples];
 		int hist[] = new int[samples];
                int numGlucose[] = new int[samples];
 		
 		FileWriter writer;
 		
 		try{
 			writer = new FileWriter(out_csvFile);
 			//Write the header line
 			Vector<String> header = new Vector<String>(samples + 1);
                        for (int i = 0; i < demographicTypes.size(); i++) {
                            header.add(demographicTypes.get(i));
                        }
                        header.add("Death");
                        for (int i = 1; i <= samples; i++) {
                            if (i % 2 == 0) {
                                header.add(-i / 2 + "y");
                            }
                            else {
                                header.add(-i * 0.5 + "y");
                            }
                        }
/*                        
 			for(int i=0; i<=samples; i++) //compensate for death
 				header.add("T"+i);
*/        
 			this.writeLine(header, writer, samples);
 			Set<String> patient_ids = records_table.keySet();
 			
 			int row_no = 0;
 			for(String cur_id : patient_ids)
 			{
 				wrapperList l = records_table.get(cur_id);
                                if(l.size()>0)
                                {
                                    //For the linked list. 
                                    for(int list_ind=0; list_ind<l.size(); list_ind++)
                                    {
                                            //Get the record at the i'th position
                                            record r = l.getAt(list_ind);
                                            //Sample the values and populate the hist, hba1cMax arrays 
                                            int i;
                                            for(i=0; i<samples; i++) //compensate for death
                                            {
                                                    if((r.encounter_date).after(intervals.get(i+1)))
                                                            break;
                                            }
                                            if(i>samples)
                                                    System.err.println("Something wrong with the date range");
                                            
                                            if (r.lab_type == LabType.GLUCOSE) {
                                                numGlucose[i]++;
                                                hba1cGlucoseSum[i] += r.hba1c;
                                            }
                                            else {
                                                hist[i]++;
                                                //hba1cMax[i] = Math.max(hba1cMax[i], r.hba1c);
                                                hba1cSum[i] += r.hba1c;
                                            }
                                    }
                                }
 				// Populated the histogram and the sums
 				boolean missing = false;
 				int miss_pl=0;
 				int move_pl=-1;
 				for(int i=0; i<samples; i++)
 			 	{
 			 	//Classify the diastolic and systolic values, identify missing values
 			 		if(hist[i] > 0 || numGlucose[i] > 0)
 			 		{
 			 			if(missing)
 			 			{
 			 				missing = !missing;
 			 				if(miss_pl>0)
 			 				{
 			 					String c = tableRow.get(miss_pl-1);
 			 					for(int j = miss_pl; j<i; j++)
 			 						tableRow.set(j, c);
 			 				}
 			 				else
 			 					move_pl = i;
 			 			}
                                                
                                                if (hist[i] > 0) {
                                                    //tableRow.add(i, classifyDiasSys(hba1cMax[i]));
                                                    tableRow.add(i, classifyDiasSys(hba1cSum[i] / hist[i]));
                                                }
                                                else {
                                                    // Use value computed from glucose
                                                    tableRow.add(i, classifyDiasSys(hba1cGlucoseSum[i] / numGlucose[i]));
                                                }
                                                
 			 		}
 			 		else if(i == 0)
 			 		{
 			 			missing = true;
 			 			miss_pl = 0;
 			 			tableRow.add(i, "Missing");
 			 		}
 			 		else if(i > 0)
 			 		{
 			 			if(!missing)
 			 			{
 			 				missing = true;
 			 				miss_pl = i;
 			 			}
 			 			tableRow.add(i, "Missing");
 			 		}
 			 	}
 				//move_pl is the first place where a non-missing piece was found when the row started with "Missing"
 				if(move_pl>=1)
 				{
 					for(int i=0; i<samples-move_pl; i++)
 						tableRow.set(i, tableRow.get(i+move_pl));
 					for(int i=samples-move_pl; i<samples; i++)
 						tableRow.set(i, "Missing");
 				}
                                
                                // DMB : Remove Death
                                for (int i = samples - 2; i >= 0; i--) {
                                    if (tableRow.get(i).equals("Death")) {
                                        tableRow.set(i, tableRow.get(i + 1));
                                    }
                                }
                                   
                                for (int i = 0; i < demographicTypes.size(); i++) {
                                    tableRow.add(i, l.demographics.get(i));
                                }
 					
		 		//Write a line in the output csv file
 			 	this.writeLine(tableRow, writer, samples);
 			 	System.out.println(row_no + ": Patient ID: " +cur_id);
                                row_no++;
 			 //	records_table.remove(cur_id);
 				for(int i=0; i<samples; i++)
 					hist[i] = hba1cSum[i] = numGlucose[i] = hba1cGlucoseSum[i] = 0;
 				tableRow.clear();
 				
 			}

	 		writer.close();
	 		
 		}catch(FileNotFoundException e)
 		{
 			e.printStackTrace();
 		}catch(IOException e)
 		{
 			e.printStackTrace();
 		}finally{
 		}
 		
 	}
 	
 	private<E> void writeLine(Vector<E> row, FileWriter writer, int samples) throws IOException
 	{
 		for(int i=0; i<samples-1; i++)
				writer.append(row.get(i)+",");
		writer.append(row.get(samples-1)+"\n");
		writer.flush();
 	}
 	
 	private String classifyDiasSys(int hba1c)
 	{
            /*
            if(hba1c < 0)
                return "Undefined";
            if(hba1c == 0)
                return "Death";
            if(hba1c < 57)
                return "Normal";
            else if(hba1c < 65)
                return "BorderlineDiab";
            else if(hba1c < 80)
                return "ControlledDiab";
            else
                return "Uncontrolled";
            */
            if(hba1c < 0)
                return "Undefined";
            if(hba1c == 0)
                return "Death";
            else 
                return Double.toString((double)hba1c / 10.0);
 	}
 	
 	public void printMinMaxDate()
 	{
 		System.out.println(minDate + " "+maxDate);
 	}
 	
	public PreprocessDiabetes()
	{
		this("", "", "", -1);
	}
	//Constructor to assign memories
	public PreprocessDiabetes(String _filename, String _deathfile, String _genderfile, int number_records)
	{
		minDate = new Date(0);
		maxDate = new Date(0);
		filename = _filename;
                deathfilename = _deathfile;
                genderfilename = _genderfile;
		records_table = new HashMap<String, wrapperList>();
                demographicTypes = new ArrayList<String>();
	}
        
        private HashMap<String,wrapperList > records_table;
	
 	private String filename;
        private String deathfilename;
        private String genderfilename;
 	private Date minDate, maxDate;    
        
        ArrayList<String> demographicTypes;
}
